import type { Part, Target } from './types'

export type SkillBranch = 'mining' | 'cargo' | 'range' | 'engineering'
export type SkillNodeId = 'laser-charge-1' | 'cargo-slot-1' | 'near-range-1' | 'ship-customizer-1'

export interface SkillNode {
  id: SkillNodeId
  name: string
  branch: SkillBranch
  cost: number
  description: string
}

export const BASE_LASER_CHARGES = 5
export const SKILL_NODES: SkillNode[] = [
  {
    id: 'laser-charge-1',
    name: 'Laser Charge I',
    branch: 'mining',
    cost: 1,
    description: 'Mining laser starts each mission with +2 charges.',
  },
  {
    id: 'cargo-slot-1',
    name: 'Cargo Slot I',
    branch: 'cargo',
    cost: 1,
    description: 'Cargo capacity is increased by 20%.',
  },
  {
    id: 'near-range-1',
    name: 'Near-Range I',
    branch: 'range',
    cost: 2,
    description: 'L1 travel time is reduced by 15% and near-range reach improves.',
  },
  {
    id: 'ship-customizer-1',
    name: 'Ship Customizer',
    branch: 'engineering',
    cost: 1,
    description: 'Unlocks the hangar interior view with slotted ship rooms.',
  },
]

export function hasSkill(unlocked: string[] | undefined, id: SkillNodeId): boolean {
  return unlocked?.includes(id) ?? false
}

export function getSkillNode(id: string): SkillNode | undefined {
  return SKILL_NODES.find(node => node.id === id)
}

export function canUnlockSkillNode(opts: {
  id: string
  skillPoints: number
  unlockedSkillNodes?: string[]
}): boolean {
  const node = getSkillNode(opts.id)
  if (!node) return false
  if (hasSkill(opts.unlockedSkillNodes, node.id)) return false
  return opts.skillPoints >= node.cost
}

export function getLaserChargeCap(unlockedSkillNodes?: string[]): number {
  return BASE_LASER_CHARGES + (hasSkill(unlockedSkillNodes, 'laser-charge-1') ? 2 : 0)
}

export function hasShipCustomizer(unlockedSkillNodes?: string[]): boolean {
  return hasSkill(unlockedSkillNodes, 'ship-customizer-1')
}

export function effectiveCargoCapacity(part: Part, unlockedSkillNodes?: string[]): number {
  const cargo = part.cargo ?? 0
  if (!hasSkill(unlockedSkillNodes, 'cargo-slot-1')) return cargo
  return Math.floor(cargo * 1.2)
}

export function effectiveMaxOrbit(part: Part, unlockedSkillNodes?: string[]): number {
  const orbit = part.max_orbit ?? 0
  if (!hasSkill(unlockedSkillNodes, 'near-range-1')) return orbit
  return orbit + 1
}

export function travelDurationMs(target: Target, unlockedSkillNodes?: string[], msPerOrbit = 2 * 60 * 1000): number {
  const base = target.orbit * msPerOrbit
  if (!hasSkill(unlockedSkillNodes, 'near-range-1')) return base
  return Math.round(base * 0.85)
}
