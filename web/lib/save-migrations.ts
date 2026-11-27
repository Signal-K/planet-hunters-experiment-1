// Save migrations for the cycle 11 simplification. The refinery, price alerts, subsurface rooms, laser
// capacitor and base arrangement were removed from the game. A save that owned any of them is converted once
// into things that still exist (francs, ore, storage), then the retired fields are dropped. The conversion is
// recorded in `saveMigrations`, so loading the same save again never pays twice.

export const SIMPLIFY_2026_11 = 'simplify-2026-11'

// Frozen from the retired refinery recipes: what one finished good sold for, in francs.
const REFINED_GOOD_PRICE: Record<string, number> = {
  'refined-gold': 13_440_000,
  'refined-uranium': 13_440_000,
  'refined-cobalt': 8_064_000,
  'refined-copper': 6_400_000,
  'refined-aluminium': 6_400_000,
  'refined-hydrogen': 10_752_000,
}

// Ore spent on the retired laser capacitor, by level reached (6, then 12, then 20 per tier). Refunded as iron.
const LASER_CAPACITOR_ORE_SPENT = [0, 6, 18, 38]

// Ore capacity the retired underground vaults added.
const SUBSURFACE_STORAGE: Record<string, number> = { 'mineral-vault': 120, 'deep-mineral-vault': 300 }

const RETIRED_FIELDS = [
  'buildingLevels', 'launchpadUpgraded', 'underConstruction',
  'refinedGoods', 'refineryQueue', 'refineryLastStartedAt', 'refineryBuilt', 'refineryUnlocked', 'refineryUnlockNotified', 'priceAlerts',
  'subsurfaceExcavated', 'subsurfaceBuilt', 'baseArrangement', 'laserCapacitorLevel',
] as const

const RETIRED_PLACED = new Set(['market', 'refinery'])

// Agency level each building gives (the same table the agency model has always used).
const LEVEL_SOURCES: Record<string, string> = {
  launch: 'launchpad',
  'ore-storage': 'surface-silo',
  refining: 'refinery',
  exchange: 'market',
  'rocket-discounts': 'hangar',
  'data-hub': 'control-station',
}

function clampLevel(value: unknown, min: number): number {
  const n = typeof value === 'number' && Number.isFinite(value) ? Math.floor(value) : min
  return Math.min(3, Math.max(min, n))
}

/** Building levels, the launchpad flag and the control-station flag become agency levels (never lowering one). */
function foldBuildingLevels(player: Loose): Record<string, number> {
  const placed = Array.isArray(player.placed) ? player.placed as unknown[] : []
  const levels = player.buildingLevels && typeof player.buildingLevels === 'object' ? player.buildingLevels as Loose : {}
  const out: Record<string, number> = {}
  const recorded = player.agencyLevels && typeof player.agencyLevels === 'object' ? player.agencyLevels as Loose : {}
  for (const [id, kind] of Object.entries(LEVEL_SOURCES)) {
    let level = clampLevel(recorded[id], 0)
    if (placed.includes(kind)) {
      let built = clampLevel(levels[kind], 1)
      if (kind === 'launchpad' && player.launchpadUpgraded) built = Math.max(built, 2)
      level = Math.max(level, built)
    }
    if (id === 'data-hub' && player.controlBuilt) level = Math.max(level, 1)
    if (level > 0) out[id] = level
  }
  return out
}

type Loose = Record<string, unknown>

function num(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : 0
}

export function migrateSimplifiedSave<T extends Loose>(player: T): T {
  const saved = Array.isArray(player.saveMigrations)
    ? (player.saveMigrations as unknown[]).filter((m): m is string => typeof m === 'string')
    : []
  const next: Loose = { ...player }
  const agencyLevels = foldBuildingLevels(player)
  if (Object.keys(agencyLevels).length > 0) next.agencyLevels = agencyLevels

  if (!saved.includes(SIMPLIFY_2026_11)) {
    let francs = num(player.francs)
    const goods = player.refinedGoods && typeof player.refinedGoods === 'object' ? player.refinedGoods as Loose : {}
    for (const [id, qty] of Object.entries(goods)) francs += Math.floor(num(qty)) * (REFINED_GOOD_PRICE[id] ?? 0)
    const queue = Array.isArray(player.refineryQueue) ? player.refineryQueue as Loose[] : []
    for (const job of queue) francs += REFINED_GOOD_PRICE[String(job?.recipeId)] ?? 0
    if (francs !== num(player.francs)) next.francs = francs

    const level = Math.min(3, Math.floor(num(player.laserCapacitorLevel)))
    if (level > 0) {
      const stash = { ...((player.stash as Record<string, number> | undefined) ?? {}) }
      stash.iron = (stash.iron ?? 0) + LASER_CAPACITOR_ORE_SPENT[level]
      next.stash = stash
    }

    const rooms = Array.isArray(player.subsurfaceBuilt) ? player.subsurfaceBuilt as unknown[] : []
    const vaults = rooms.reduce<number>((sum, room) => sum + (SUBSURFACE_STORAGE[String(room)] ?? 0), 0)
    if (vaults > 0) next.storageBonus = num(player.storageBonus) + vaults
  }

  for (const field of RETIRED_FIELDS) delete next[field]
  if (Array.isArray(next.placed)) next.placed = (next.placed as unknown[]).filter(kind => !RETIRED_PLACED.has(String(kind)))
  if (next.placementPlots && typeof next.placementPlots === 'object') {
    next.placementPlots = Object.fromEntries(Object.entries(next.placementPlots as Loose).filter(([kind]) => !RETIRED_PLACED.has(kind)))
  }
  if (!saved.includes(SIMPLIFY_2026_11)) next.saveMigrations = [...saved, SIMPLIFY_2026_11]
  return next as T
}
