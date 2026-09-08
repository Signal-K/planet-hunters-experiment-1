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

/** Whether the player's own program has delivered (or further along) a
 * structure of this kind anywhere off-world. Used to gate a build option
 * that only makes sense once an earlier one exists (07/09/26 QA report: a
 * refinery was offered before the player had any silo or mining settlement
 * to feed it). */
export function ownProgramStructureDelivered(player: Player, structureKind: string): boolean {
  return (player.clientStructures ?? []).some(structure =>
    structure.clientId === OWN_PROGRAM_CLIENT_ID
    && structure.structureKind === structureKind
    && (structure.state === 'delivered' || structure.state === 'operational'))
}

export function resolveConstructionState(record: ClientStructureRecord, buildTimeMs: number, now = Date.now()): ClientStructureRecord {
  if (record.state !== 'under-construction' || record.startedAt === undefined) return record
  return now - record.startedAt >= buildTimeMs
    ? { ...record, state: 'operational', completedAt: record.completedAt ?? record.startedAt + buildTimeMs }
    : record
}
