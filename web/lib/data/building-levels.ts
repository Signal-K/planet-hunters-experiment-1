
export const MAX_BUILDING_LEVEL = 3

function clampLevel(value: unknown): number {
  const n = typeof value === 'number' && Number.isFinite(value) ? Math.floor(value) : 1
  return Math.min(MAX_BUILDING_LEVEL, Math.max(1, n))
}

const SILO_CAPACITY_MULTIPLIER = [1, 2, 3] as const
const TIME_MULTIPLIER = [1, 0.75, 0.5] as const
/** Launches a pad takes before it needs service, by level: a bigger pad wears less (SSL-693). */
export const PAD_LAUNCHES_BETWEEN_SERVICE = [10, 14, 20] as const
/** Francs for one service, which resets the count. Flat at every level; the upgrade pays off in how rarely it is due. */
export const PAD_SERVICE_COST = 1_000_000

const PAD_BUILD_MULTIPLIER = [1, 0.75, 0.5] as const
const HANGAR_ROCKET_DISCOUNT = [0, 0.1, 0.2] as const
const EXCHANGE_SALE_BONUS = [0, 0.03, 0.06] as const
const PROBE_SECTOR_HOURS_BY_LEVEL = [2, 1.5, 1] as const
const LAUNCHPAD_MISSION_FLOOR = [0, 1, 2] as const

/** Level of a building; anything absent or malformed (every old save) is level 1. The legacy
 */

export const siloCapacityMultiplier = (level: number) => SILO_CAPACITY_MULTIPLIER[clampLevel(level) - 1]
type PadWearPlayer = { padLaunches?: number; agencyLevels?: Partial<Record<string, number>> }

/** Launches left before the pad needs service. Every launch counts; the three training launches stay well under the first limit of 10. */
export function padLaunchesLeft(player: PadWearPlayer): number {
  const used = Math.max(0, Math.floor(player.padLaunches ?? 0))
  return Math.max(0, PAD_LAUNCHES_BETWEEN_SERVICE[clampLevel(player.agencyLevels?.launch) - 1] - used)
}

/** A worn pad holds launches until it is serviced. */
export function padNeedsService(player: PadWearPlayer): boolean {
  return padLaunchesLeft(player) <= 0
}
/** SSL-792: what a hangar level takes off a rocket's price. */
export const hangarRocketDiscount = (level: number) => HANGAR_ROCKET_DISCOUNT[clampLevel(level) - 1]
/** SSL-792: what an Exchange level adds to every sale. */
export const exchangeSaleBonus = (level: number) => EXCHANGE_SALE_BONUS[clampLevel(level) - 1]
/** SSL-792: hours a probe launched at this control station level takes per sector. */
export const probeSectorHours = (level: number) => PROBE_SECTOR_HOURS_BY_LEVEL[clampLevel(level) - 1]
export const launchpadMissionFloor = (level: number) => LAUNCHPAD_MISSION_FLOOR[clampLevel(level) - 1]

