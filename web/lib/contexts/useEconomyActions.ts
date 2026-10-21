import { useCallback } from 'react'
import { REFINERY_RECIPES } from '@/lib/data'
import { applySellMinerals, applySellRefinedGoods, applyStartRefine, applyCollectRefined, applyUpgradeLaunchpad, applyUpgradeBuilding, applyConfirmShipCustomizerBuild, applyPlaceStructure, applyExcavateSubsurface, applyBuildSubsurfaceRoom } from '@/lib/systems/EconomySystem'
import { applyUnlockSkillNode, applyAcceptLoan, applyAbandonMission } from '@/lib/systems/ProgressionSystem'
import type { TreasuryState } from '@/lib/systems/TreasurySystem'
import { captureGameEvent } from '@/lib/posthog'
import { completeFlightPlanEvent, earnsTrainingReplayReward, TRAINING_REPLAY_REWARD } from '@/lib/systems/FlightPlanSystem'
import { freeOperationsUnlocked } from '@/lib/systems/AgencyOnboardingSystem'
import { pbLandnam } from '@/lib/pb-landnam'
import { queueUpdate } from '@/lib/offline/pbOutbox'
import { isSettledMissionRun } from '@/lib/systems/MissionRunLifecycle'
import { applyBuyMinerals, applySetPriceAlert, applyRemovePriceAlert, applyFireDueAlerts } from '@/lib/systems/MarketplaceSystem'
import type { Catalog } from '@/lib/catalog'
import type { GameState } from '@/lib/game-types'
import type { Mission, ShipRoomKind, StructureBlueprint, SubsurfaceRoomId } from '@/lib/data'

export function useEconomyActions(
  setState: React.Dispatch<React.SetStateAction<GameState>>,
  getCatalogMissions: () => Mission[],
) {
  const sellMinerals = useCallback((mineralId: string, amount: number) => {
    setState(s => applySellMinerals(s, mineralId, amount))
  }, [setState])

  const buyMinerals = useCallback((mineralId: string, amount: number) => {
    setState(s => applyBuyMinerals(s, mineralId, amount))
  }, [setState])

  const setPriceAlert = useCallback((mineralId: string, target: number) => {
    setState(s => applyFireDueAlerts(applySetPriceAlert(s, mineralId, target)))
  }, [setState])

  const removePriceAlert = useCallback((alertId: string) => {
    setState(s => applyRemovePriceAlert(s, alertId))
  }, [setState])

  const checkPriceAlerts = useCallback(() => {
    setState(s => applyFireDueAlerts(s))
  }, [setState])

  const sellRefinedGoods = useCallback((recipeId: string, amount: number) => {
    const recipe = REFINERY_RECIPES.find(r => r.id === recipeId)
    if (!recipe) return
    setState(s => applySellRefinedGoods(s, recipe, amount))
  }, [setState])

  const onStartRefine = useCallback((recipeId: string) => {
    const recipe = REFINERY_RECIPES.find(r => r.id === recipeId)
    if (!recipe) return
    setState(s => applyStartRefine(s, recipe))
  }, [setState])

  const onCollectRefined = useCallback((recipeId: string) => {
    const recipe = REFINERY_RECIPES.find(r => r.id === recipeId)
    if (!recipe) return
    setState(s => applyCollectRefined(s, recipe))
  }, [setState])

  const placeStructure = useCallback((structure: StructureBlueprint | undefined, kind: string, plot: number) => {
    let placed = false
    setState(s => {
      const next = applyPlaceStructure(s, structure, kind, plot)
      placed = next !== s
      return next
    })
    return placed
  }, [setState])

  const upgradeLaunchpad = useCallback(() => {
    setState(s => applyUpgradeLaunchpad(s))
  }, [setState])

  const upgradeBuilding = useCallback((id: string) => {
    setState(s => applyUpgradeBuilding(s, id))
  }, [setState])

  const excavateSubsurface = useCallback(() => {
    setState(s => applyExcavateSubsurface(s))
  }, [setState])

  const buildSubsurfaceRoom = useCallback((roomId: SubsurfaceRoomId) => {
    setState(s => applyBuildSubsurfaceRoom(s, roomId))
  }, [setState])

  const unlockSkillNode = useCallback((id: string) => {
    setState(s => applyUnlockSkillNode(s, id))
  }, [setState])

  const acceptLoan = useCallback(() => {
    // Loans change both a player's persisted balance and the public treasury,
    // so the backend owns the transaction. Keep the local-only transition as
    // a fallback for preview surfaces, which deliberately have no auth.
    if (!pbLandnam.authStore.isValid) {
      setState(s => applyAcceptLoan(s))
      return
    }
    void pbLandnam.send<{ state: TreasuryState; changed: boolean; principalFrancs: number }>('/api/treasury/bankruptcy-loan', {
      method: 'POST',
    }).then(response => {
      if (!response.changed) return
      setState(s => ({
        ...s,
        popup: null,
        player: {
          ...s.player,
          francs: s.player.francs + response.principalFrancs,
          loanDebt: response.principalFrancs,
          loanOffered: true,
          treasury: response.state,
        },
      }))
    })
  }, [setState])

  const abandonMission = useCallback((opts?: { confirmed?: boolean }) => {
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
      return applyAbandonMission(s, getCatalogMissions())
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
      const replayReward = earnsTrainingReplayReward(result.state.player.flightPlan, 'part')
      const flightPlan = completeFlightPlanEvent(result.state.player.flightPlan, 'part-tweaked')
      const player = {
        ...result.state.player,
        francs: result.state.player.francs + (replayReward ? TRAINING_REPLAY_REWARD.francs : 0),
        researchXP: (result.state.player.researchXP ?? 0) + (replayReward ? TRAINING_REPLAY_REWARD.researchXP : 0),
        stash: replayReward ? {
          ...(result.state.player.stash ?? {}),
          iron: (result.state.player.stash?.iron ?? 0) + TRAINING_REPLAY_REWARD.stash.iron,
        } : result.state.player.stash,
        flightPlan,
      }
      return { ...result.state, tutorial: !freeOperationsUnlocked(player), player: { ...player, freeOperations: freeOperationsUnlocked(player) } }
    })
    return applied
  }, [setState])

  return {
    sellMinerals, buyMinerals, setPriceAlert, removePriceAlert, checkPriceAlerts, sellRefinedGoods, onStartRefine, onCollectRefined, placeStructure, upgradeLaunchpad, upgradeBuilding,
    excavateSubsurface, buildSubsurfaceRoom,
    unlockSkillNode, acceptLoan, abandonMission,
    confirmShipCustomizerBuild,
  }
}
