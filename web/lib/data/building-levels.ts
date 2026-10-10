import { STRUCTURE_PRICES, SURFACE_SILO_PRICE } from './economy'

/** Upgradable Earth Base buildings. The Garage is a future-sprint structure and has no levels yet. */
export const UPGRADABLE_BUILDINGS = ['launchpad', 'surface-silo', 'refinery', 'astronaut-academy'] as const
export type UpgradableBuildingId = typeof UPGRADABLE_BUILDINGS[number]

export const MAX_BUILDING_LEVEL = 3

export type BuildingLevels = Partial<Record<UpgradableBuildingId, number>>

/** Francs to reach level 2 and level 3. Level 2 costs the building's base price (the
 *  launchpad's is the original single upgrade); level 3 costs double level 2. */
export const BUILDING_UPGRADE_COSTS: Record<UpgradableBuildingId, readonly [number, number]> = {
  launchpad: [STRUCTURE_PRICES.launchpadUpgrade, STRUCTURE_PRICES.launchpadUpgrade * 2],
  'surface-silo': [SURFACE_SILO_PRICE * 2, SURFACE_SILO_PRICE * 4],
  refinery: [STRUCTURE_PRICES.refinery, STRUCTURE_PRICES.refinery * 2],
  'astronaut-academy': [STRUCTURE_PRICES.academy, STRUCTURE_PRICES.academy * 2],
}

/** One concrete effect per building and level, shown on the building sheet. */
export const BUILDING_LEVEL_EFFECTS: Record<UpgradableBuildingId, readonly [string, string, string]> = {
  launchpad: ['Base parts and targets', 'Unlocks the parts and targets of a flown mission', 'Unlocks the parts and targets of two flown missions'],
  'surface-silo': ['Holds 40 units of ore', 'Holds 80 units of ore', 'Holds 120 units of ore'],
  refinery: ['Standard refining time', 'Refining takes 25% less time', 'Refining takes 50% less time'],
  'astronaut-academy': ['Day-long training sessions', 'Training takes 25% less time', 'Training takes 50% less time'],
}

const SILO_CAPACITY_MULTIPLIER = [1, 2, 3] as const
const TIME_MULTIPLIER = [1, 0.75, 0.5] as const
const LAUNCHPAD_MISSION_FLOOR = [0, 1, 2] as const

export function isUpgradableBuilding(id: string): id is UpgradableBuildingId {
  return (UPGRADABLE_BUILDINGS as readonly string[]).includes(id)
}

function clampLevel(value: unknown): number {
  const n = typeof value === 'number' && Number.isFinite(value) ? Math.floor(value) : 1
  return Math.min(MAX_BUILDING_LEVEL, Math.max(1, n))
}

/** Level of a building; anything absent or malformed (every old save) is level 1. The legacy
 *  `launchpadUpgraded` flag is level 2 of the launchpad. */
export function buildingLevel(player: { buildingLevels?: BuildingLevels; launchpadUpgraded?: boolean }, id: UpgradableBuildingId): number {
  const level = clampLevel(player.buildingLevels?.[id])
  return id === 'launchpad' && player.launchpadUpgraded ? Math.max(level, 2) : level
}

/** Price of the upgrade from `level` to `level + 1`, or null at max level. */
export function upgradeCost(id: UpgradableBuildingId, level: number): number | null {
  return level >= MAX_BUILDING_LEVEL ? null : BUILDING_UPGRADE_COSTS[id][level - 1]
}

/** Drops unknown keys, clamps levels to 1..3 and keeps only levels above 1. Never touches `placed`. */
export function sanitizeBuildingLevels(raw: unknown, launchpadUpgraded = false): BuildingLevels {
  const source = raw && typeof raw === 'object' ? raw as Record<string, unknown> : {}
  const out: BuildingLevels = {}
  for (const id of UPGRADABLE_BUILDINGS) {
    const level = clampLevel(source[id])
    const withLegacy = id === 'launchpad' && launchpadUpgraded ? Math.max(level, 2) : level
    if (withLegacy > 1) out[id] = withLegacy
  }
  return out
}

/** Per-key max, so a stale save on either side can never lower a level. */
export function mergeBuildingLevels(a: BuildingLevels | undefined, b: BuildingLevels | undefined): BuildingLevels {
  const out: BuildingLevels = {}
  for (const id of UPGRADABLE_BUILDINGS) {
    const level = Math.max(clampLevel(a?.[id]), clampLevel(b?.[id]))
    if (level > 1) out[id] = level
  }
  return out
}

export const siloCapacityMultiplier = (level: number) => SILO_CAPACITY_MULTIPLIER[clampLevel(level) - 1]
export const buildingTimeMultiplier = (level: number) => TIME_MULTIPLIER[clampLevel(level) - 1]
export const launchpadMissionFloor = (level: number) => LAUNCHPAD_MISSION_FLOOR[clampLevel(level) - 1]

export const BUILDING_NAMES: Record<UpgradableBuildingId, string> = {
  launchpad: 'Launchpad',
  'surface-silo': 'Surface Silo',
  refinery: 'Refinery',
  'astronaut-academy': 'Academy',
}
