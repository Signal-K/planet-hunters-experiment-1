import type { ClientStructureRecord, Mission } from '@/lib/data'
import type { Player } from '@/lib/game-types'
import { OWN_PROGRAM_CLIENT_ID } from '@/lib/data'

/** Persist a completed client build at any target body, including exoplanets. */
export function applyConstructionCompletion(player: Player, mission: Mission, targetId: string, now = Date.now()): Player {
  const plan = mission.construction
  if (!plan || !targetId) return player
  const structures = [...(player.clientStructures ?? [])]
  const existing = structures.findIndex(s => s.targetId === targetId && s.structureKind === plan.structureKind)
  if (existing >= 0 && structures[existing].state !== 'delivered') return player
  const record: ClientStructureRecord = {
    targetId, structureKind: plan.structureKind, clientId: mission.client ?? OWN_PROGRAM_CLIENT_ID,
    state: 'under-construction', startedAt: now,
  }
  if (existing >= 0) structures[existing] = record
  else structures.push(record)
  return { ...player, clientStructures: structures }
}

export function resolveConstructionState(record: ClientStructureRecord, buildTimeMs: number, now = Date.now()): ClientStructureRecord {
  if (record.state !== 'under-construction' || record.startedAt === undefined) return record
  return now - record.startedAt >= buildTimeMs
    ? { ...record, state: 'operational', completedAt: record.completedAt ?? record.startedAt + buildTimeMs }
    : record
}
