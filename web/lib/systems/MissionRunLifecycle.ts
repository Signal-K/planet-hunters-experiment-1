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

const RUN_SCREENS = new Set<Screen>(['flight', 'landing', 'mining', 'delivery', 'debrief'])

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
    missionStartedAt: undefined,
    missionPhase: undefined,
    miningCargoInProgress: undefined,
    miningLaserCharges: undefined,
    deliveryUnloadStartedAt: undefined,
    landingStartedAt: undefined,
    landingReturnStartedAt: undefined,
    arrivalAt: null,
    transitStartedAt: null,
    missionRocketSource: undefined,
    debriefPending: false,
    homeDeliveryPending: false,
    homeSettlement: undefined,
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

const MAX_SCRUBBED = 50

/** Keys that identify the active sortie, however much of its identity survived a sync. */
export function activeRunKeys(player: Pick<Player, 'activeMission' | 'missionRunId' | 'transitStartedAt'>): string[] {
  const run = player.activeMission
  if (!run) return []
  // The run id is unique to one sortie. Only a run that lost it falls back to mission id plus launch time,
  // so a later flight of the same contract is never caught by an old scrub.
  if (player.missionRunId) return [player.missionRunId]
  return [`${run.id}:${player.transitStartedAt ?? 'current'}`]
}

function pausedRunKeys(run: MissionRunSnapshot): string[] {
  return [run.missionRunId, run.key].filter((key): key is string => !!key)
}

/** Record that a run was scrubbed, so a stale server copy cannot resurrect it. */
export function withScrubbedRun(player: Player, keys: string[]): Player {
  const known = new Set(player.scrubbedRuns ?? [])
  for (const key of keys) known.add(key)
  return { ...player, scrubbedRuns: Array.from(known).slice(-MAX_SCRUBBED) }
}

/** Remove the active run and any paused run the player scrubbed, wherever the save came from. */
export function dropScrubbedRuns(state: GameState): GameState {
  const scrubbed = new Set(state.player.scrubbedRuns ?? [])
  if (scrubbed.size === 0) return state
  const paused = state.player.pausedMissionRuns ?? []
  const keptPaused = paused.filter(run => !pausedRunKeys(run).some(key => scrubbed.has(key)))
  const activeScrubbed = activeRunKeys(state.player).some(key => scrubbed.has(key))
  if (!activeScrubbed && keptPaused.length === paused.length) return state
  return {
    ...state,
    ...(activeScrubbed ? {
      screen: RUN_SCREENS.has(state.screen) ? 'hub' as const : state.screen,
      missionId: null,
      targetId: null,
      deliveryTargetId: null,
      lastCargo: null,
      deliveredCargo: null,
    } : {}),
    player: {
      ...(activeScrubbed ? clearActiveRunPlayer(state.player) : state.player),
      pausedMissionRuns: keptPaused,
    },
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
