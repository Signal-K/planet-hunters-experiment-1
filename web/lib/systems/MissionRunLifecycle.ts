// A collected run is finished. It must not stay in the active list, reopen as a
// fresh mining sortie, or pay a second time when the player scrubs it.

import type { GameState, MissionRunSnapshot, Player, Screen } from '@/lib/game-types'

export interface MissionRunIdentity {
  runId?: string | null
  missionId?: string | null
  targetId?: string | null
  /** Wall-clock launch of this sortie. A later flight of the same contract is a new run. */
  launchedAt?: number | null
}

const RUN_SCREENS = new Set<Screen>(['transit', 'landing', 'mining', 'rover-mining', 'delivery', 'debrief'])

/** True when this sortie was already collected. A later flight of the same contract is not settled. */
export function isSettledMissionRun(player: Pick<Player, 'completedMissions'>, run: MissionRunIdentity): boolean {
  const completed = player.completedMissions ?? []
  if (completed.length === 0) return false
  return completed.some(record => {
    // Both ids present: only that exact sortie is settled. A different flight
    // of the same contract, parked or launched later, stays active.
    if (run.runId && record.runId) return record.runId === run.runId
    if (!run.missionId || record.id !== run.missionId) return false
    if (run.targetId && record.targetId && record.targetId !== run.targetId) return false
    if (run.launchedAt == null || !Number.isFinite(run.launchedAt)) return false
    return record.completedAt >= run.launchedAt
  })
}

export function clearActiveRunPlayer(player: Player): Player {
  return {
    ...player,
    activeMission: null,
    missionRunId: undefined,
    missionPhase: undefined,
    miningCargoInProgress: undefined,
    miningLaserCharges: undefined,
    deliveryUnloadStartedAt: undefined,
    landingStartedAt: undefined,
    landingReturnStartedAt: undefined,
    roverMiningStartedAt: undefined,
    arrivalAt: null,
    transitStartedAt: null,
    missionRocketSource: undefined,
    missionCrewIds: [],
    debriefPending: false,
    cargoSettledOffworld: false,
    pendingRemoteDisposition: undefined,
    returningToEarth: false,
    headingToDelivery: false,
    shipDestroyed: false,
    freeHaulDisposition: undefined,
  }
}

function runIdentity(run: MissionRunSnapshot): MissionRunIdentity {
  return {
    runId: run.missionRunId,
    missionId: run.missionId,
    targetId: run.targetId,
    launchedAt: run.transitStartedAt,
  }
}

/** Drop a collected active sortie and any paused copy of a collected sortie. */
export function dropSettledMissionRuns(state: GameState): GameState {
  const paused = (state.player.pausedMissionRuns ?? []).filter(run => !isSettledMissionRun(state.player, runIdentity(run)))
  const active = state.player.activeMission
  const activeSettled = !!active && isSettledMissionRun(state.player, {
    runId: state.player.missionRunId,
    missionId: active.id,
    targetId: state.targetId,
    launchedAt: state.player.transitStartedAt,
  })
  const pausedChanged = paused.length !== (state.player.pausedMissionRuns ?? []).length
  if (!activeSettled && !pausedChanged) return state
  const leaveRunScreen = activeSettled && RUN_SCREENS.has(state.screen)
  return {
    ...state,
    ...(activeSettled ? {
      screen: leaveRunScreen ? 'launchpad' as const : state.screen,
      missionId: null,
      targetId: null,
      deliveryTargetId: null,
      lastCargo: null,
      deliveredCargo: null,
    } : {}),
    player: {
      ...(activeSettled ? clearActiveRunPlayer(state.player) : state.player),
      pausedMissionRuns: paused,
    },
  }
}
