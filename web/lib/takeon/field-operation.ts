import type { RoverSpec } from '@takeon/engine'
import type { Mission, Target } from '@/lib/data/types'
import { surfaceSiteById } from '@/lib/data/surface-ops'
import type {
  FieldOperation,
  FieldOperationObjectiveKind,
} from '@/lib/game-types'

export interface FieldOperationMissionInput {
  mission: Mission
  target: Target
  siteId: string
  rover: RoverSpec
  accessPurchasedAt: number
  startedAt: number
}
function stableSeed(value: string): number {
  let hash = 2166136261
  for (const char of value) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619)
  return hash >>> 0
}

function objectiveKind(mission: Mission): FieldOperationObjectiveKind {
  if (mission.construction) return 'settlement'
  if (mission.deliveryTargetId) return 'logistics'
  return 'prospecting'
}

/**
 * Builds the host-owned handoff passed to TakeOn. This is deliberately pure:
 * it does not write saves, spend francs, or decide how field yield is paid.
 */
export function fieldOperationForMission(
  input: FieldOperationMissionInput
): FieldOperation | null {
  const site = surfaceSiteById(input.siteId)
  if (
    !site
    || site.availability !== 'available'
    || input.mission.targetId !== input.target.id
    || !Number.isFinite(input.accessPurchasedAt)
    || !Number.isFinite(input.startedAt)
  ) return null

  const operationKey = [
    input.mission.id,
    input.target.id,
    input.siteId,
    input.accessPurchasedAt,
  ].join(':')
  const requirements = { ...input.mission.requires.minerals }
  const requiredUnits = Object.values(requirements)
    .reduce((total, amount) => total + Math.max(0, Math.floor(amount)), 0)

  return {
    id: `field-${stableSeed(operationKey).toString(36)}`,
    missionId: input.mission.id,
    targetId: input.target.id,
    siteId: input.siteId,
    bodyId: site.bodyId,
    seed: stableSeed(`${operationKey}:world`),
    rover: input.rover,
    label: `${input.mission.title} · ${site.name}`,
    cargo: {
      requirements,
      capacity: Math.max(input.mission.requires.cargo_min, requiredUnits),
    },
    objective: {
      kind: objectiveKind(input.mission),
      description: input.mission.brief,
    },
    returnPolicy: {
      owner: 'landnam',
      reconcileAt: 'field-return',
    },
    startedAt: input.startedAt,
  }
}
