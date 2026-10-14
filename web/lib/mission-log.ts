import type { CompletedMissionRecord } from '@/lib/game-types'
import type { Mission } from '@/lib/data'

export interface MissionLogRow {
  mission_id?: unknown
  target_id?: unknown
  completed_at?: unknown
  created?: unknown
}

const INSTRUMENT_TITLES: Record<string, string> = {
  'story-transit-telescope-launch': 'Launch Transit Telescope',
  'story-deep-space-telescope-survey': 'Launch Deep Space Telescope',
  'story-saturn-imager-launch': 'Launch Saturn Imager',
}

function completedAt(row: MissionLogRow): number | null {
  const value = typeof row.completed_at === 'string' ? row.completed_at : row.created
  const timestamp = typeof value === 'string' ? Date.parse(value) : NaN
  return Number.isFinite(timestamp) ? timestamp : null
}

/** Converts the owner-scoped PocketBase ledger into the UI's local record shape. */
export function projectMissionLog(rows: readonly MissionLogRow[], missions: readonly Mission[]): CompletedMissionRecord[] {
  const missionById = new Map(missions.map(mission => [mission.id, mission]))
  return rows.flatMap(row => {
    const id = typeof row.mission_id === 'string' ? row.mission_id : null
    const at = completedAt(row)
    if (!id || at === null) return []
    const mission = missionById.get(id)
    return [{
      id,
      title: mission?.title ?? INSTRUMENT_TITLES[id] ?? id,
      targetId: typeof row.target_id === 'string' ? row.target_id : undefined,
      completedAt: at,
      kind: mission?.client ? 'client' : 'program',
    }]
  })
}

/** Keeps the device log but adds any durable entries it missed while offline. */
export function mergeMissionLog(local: readonly CompletedMissionRecord[], remote: readonly CompletedMissionRecord[]): CompletedMissionRecord[] {
  const byKey = new Map<string, CompletedMissionRecord>()
  for (const record of [...remote, ...local]) {
    const key = record.runId ?? `${record.id}:${record.completedAt}`
    byKey.set(key, record)
  }
  return [...byKey.values()]
}
