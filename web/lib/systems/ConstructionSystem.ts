import type { ClientStructureRecord, Mission } from '@/lib/data'
import type { Player } from '@/lib/game-types'
import { OWN_PROGRAM_CLIENT_ID } from '@/lib/data'
import { planOffworldRefinery, type OffworldSiteRight } from './OffworldRefinerySystem'
import { rightIsActive } from './SiteRightsSystem'

/** Persist a completed client build at any target body, including exoplanets. */
export function applyConstructionCompletion(player: Player, mission: Mission, targetId: string, now = Date.now()): Player {
  const plan = mission.construction
  if (!plan || !targetId) return player

  // An own-program refinery is real infrastructure at a particular client
  // site, not a generic unlock. Completing the mission without an active
  // build right must never create a refinery somewhere the player cannot use.
  if (mission.client === undefined && plan.structureKind === 'refinery') {
    const refineryPlan = planOffworldRefinery(mission, activeBuildRightForTarget(player, targetId, now), now)
    if (!refineryPlan.ok) return player

    const deployments = [...(player.offworldRefineries ?? [])]
    if (deployments.some(deployment =>
      deployment.targetId === refineryPlan.deployment.targetId
      && deployment.siteId === refineryPlan.deployment.siteId
    )) return player

    const structures = [...(player.clientStructures ?? [])]
    const existingStructure = structures.findIndex(structure =>
      structure.targetId === targetId && structure.structureKind === plan.structureKind
    )
    const record: ClientStructureRecord = {
      targetId,
      structureKind: plan.structureKind,
      clientId: OWN_PROGRAM_CLIENT_ID,
      state: 'under-construction',
      startedAt: now,
    }
    if (existingStructure >= 0) structures[existingStructure] = record
    else structures.push(record)
    deployments.push(refineryPlan.deployment)
    return { ...player, clientStructures: structures, offworldRefineries: deployments }
  }
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

/** Whether the player holds a live, target-specific right to build. */
export function hasActiveBuildSiteRight(player: Player, now = Date.now()): boolean {
  return Object.values(player.siteRights?.rights ?? {}).some(right =>
    right.activities.includes('build') && rightIsActive(right, now)
  )
}

function activeBuildRightForTarget(player: Player, targetId: string, now: number): OffworldSiteRight | undefined {
  const right = Object.values(player.siteRights?.rights ?? {}).find(candidate =>
    candidate.targetId === targetId
    && candidate.activities.includes('build')
    && rightIsActive(candidate, now)
  )
  if (!right) return undefined
  return {
    targetId: right.targetId,
    siteId: right.siteId,
    kind: right.mode === 'purchase' ? 'owned' : 'leased',
    ...(right.expiresAt === undefined ? {} : { expiresAt: right.expiresAt }),
  }
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
