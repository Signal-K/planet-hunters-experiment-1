import type { MissionRunSnapshot, Player } from './game-types'

type RunPhase = NonNullable<MissionRunSnapshot['missionPhase']>

/** Why a rocket in the sky wants a tap. `null`: it is flying, nothing to do. */
export type MissionRunAttention = 'waiting' | 'arrived' | 'mining' | null

export interface MissionRunSummary {
  key: string
  label: string
  phase: RunPhase
  /** The run currently loaded as `player.activeMission`. */
  current: boolean
  attention: MissionRunAttention
}

function attentionFor(run: { missionPhase?: RunPhase; arrivalAt?: number | null; debriefPending?: boolean }, now: number): MissionRunAttention {
  const phase = run.missionPhase ?? 'transit'
  if (phase === 'mining' || phase === 'landing') return 'mining'
  if (phase === 'debrief' || phase === 'delivery' || run.debriefPending) return 'arrived'
  if (phase === 'transit' && run.arrivalAt != null && run.arrivalAt <= now) return 'arrived'
  return null
}

/** Every mission run in progress, current run first. Shared by the Home
 * mission switch and the Launchpad run list. */
export function missionRunsFor(player: Player, now = Date.now()): MissionRunSummary[] {
  const currentKey = player.activeMission
    ? (player.missionRunId ?? `${player.activeMission.id}:${player.transitStartedAt ?? 'current'}`)
    : null
  return [
    ...(player.activeMission && currentKey ? [{
      key: currentKey,
      label: player.activeMission.label,
      phase: player.missionPhase ?? 'transit',
      current: true,
      attention: attentionFor(player, now),
    }] : []),
    ...(player.pausedMissionRuns ?? []).map(run => ({
      key: run.key,
      label: run.activeMission.label,
      phase: run.missionPhase ?? 'transit',
      current: false,
      attention: attentionFor(run, now),
    })),
  ]
}
