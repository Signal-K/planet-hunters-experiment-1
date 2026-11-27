import { useCallback } from 'react'
import { applySellMinerals, applyServiceLaunchpad, applyBuildGroundTelescope, applyConfirmShipCustomizerBuild } from '@/lib/systems/EconomySystem'
import { applyAbandonMission } from '@/lib/systems/ProgressionSystem'
import { captureGameEvent } from '@/lib/posthog'
import { currentTrainingTry, completeFlightPlanEvent, earnsTrainingReplayReward, TRAINING_REPLAY_REWARD } from '@/lib/systems/FlightPlanSystem'
import { freeOperationsUnlocked } from '@/lib/systems/AgencyOnboardingSystem'
import { queueUpdate } from '@/lib/offline/pbOutbox'
import { isSettledMissionRun } from '@/lib/systems/MissionRunLifecycle'
import type { GameState } from '@/lib/game-types'
import type { Mission, ShipRoomKind } from '@/lib/data'

function finishRocketLesson(state: GameState): GameState {
  const replayReward = earnsTrainingReplayReward(state.player.flightPlan, 'part')
  const flightPlan = completeFlightPlanEvent(state.player.flightPlan, 'part-tweaked')
  const player = {
    ...state.player,
    francs: state.player.francs + (replayReward ? TRAINING_REPLAY_REWARD.francs : 0),
    researchXP: (state.player.researchXP ?? 0) + (replayReward ? TRAINING_REPLAY_REWARD.researchXP : 0),
    stash: replayReward ? {
      ...(state.player.stash ?? {}),
      iron: (state.player.stash?.iron ?? 0) + TRAINING_REPLAY_REWARD.stash.iron,
    } : state.player.stash,
    flightPlan,
  }
  return { ...state, tutorial: !freeOperationsUnlocked(player), player: { ...player, freeOperations: freeOperationsUnlocked(player) } }
}

export function useEconomyActions(
  setState: React.Dispatch<React.SetStateAction<GameState>>,
  getCatalogMissions: () => Mission[],
) {
  const reviewAgencyRocket = useCallback(() => {
    setState(s => currentTrainingTry(s.player.flightPlan) === 'part' ? finishRocketLesson(s) : s)
  }, [setState])

  const sellMinerals = useCallback((mineralId: string, amount: number) => {
    setState(s => applySellMinerals(s, mineralId, amount))
  }, [setState])

  const serviceLaunchpad = useCallback(() => {
    setState(s => applyServiceLaunchpad(s))
  }, [setState])

  const buildGroundTelescope = useCallback(() => {
    let built = false
    setState(s => {
      const next = applyBuildGroundTelescope(s)
      built = next !== s
      return next
    })
    return built
  }, [setState])

  const abandonMission = useCallback((opts?: { confirmed?: boolean; waivePenalty?: boolean }) => {
    if (!opts?.confirmed && !confirm('Abort this mission? You will lose 10% of the mission payout as a penalty.')) return
    // mission_completed has no failure counterpart today — a player who
    // aborts mid-transit (cargo + progress lost, 10% payout penalty) would
    // otherwise just look like a player who never finished, indistinguishable
    // from someone still in progress.
    let abandonedMissionId: string | null = null
    let abandonedMissionPhase: string | undefined
    setState(s => {
      abandonedMissionId = s.missionId
      abandonedMissionPhase = s.player.missionPhase
      const runId = s.player.missionRunId
      if (runId) {
        const settled = isSettledMissionRun(s.player, {
          runId,
          missionId: s.missionId ?? s.player.activeMission?.id,
          targetId: s.targetId,
          launchedAt: s.player.transitStartedAt,
        })
        queueUpdate('mission_runs', runId, settled
          ? { status: 'completed', phase: 'debrief', completed_at: new Date().toISOString() }
          : { status: 'abandoned', phase: s.player.missionPhase ?? 'transit', completed_at: new Date().toISOString() })
      }
      return applyAbandonMission(s, getCatalogMissions(), { waivePenalty: opts?.waivePenalty })
    })
    if (abandonedMissionId) {
      captureGameEvent('mission_abandoned', {
        mission_id: abandonedMissionId,
        mission_phase: abandonedMissionPhase ?? 'transit',
      })
    }
  }, [setState, getCatalogMissions])

  const confirmShipCustomizerBuild = useCallback((
    installed: Partial<Record<ShipRoomKind, string>>,
    prevInstalled: Partial<Record<ShipRoomKind, string>>,
  ) => {
    let applied = false
    setState(s => {
      const result = applyConfirmShipCustomizerBuild(s, installed, prevInstalled)
      applied = result.ok
      if (!result.ok) return result.state
      return finishRocketLesson(result.state)
    })
    return applied
  }, [setState])

  return {
    sellMinerals, serviceLaunchpad, buildGroundTelescope,
    abandonMission,
    reviewAgencyRocket, confirmShipCustomizerBuild,
  }
}
