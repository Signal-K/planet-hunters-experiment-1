// Landnam game data — structures, refinery recipes, market templates

import type { StructureBlueprint, RefineryRecipe } from './types'
import { MINERAL_VALUE, REFINING_COST_RATE, REFINING_VALUE_MULTIPLIER, STRUCTURE_PRICES, SURFACE_SILO_PRICE } from './economy'
import { MINERAL_RARITY } from './minerals'
import { CLIENT_AFFINITY_MISSION_THRESHOLD } from './clients'

// Refining takes raw ore and returns it worth REFINING_VALUE_MULTIPLIER more,
// for a cycle fee proportional to the input's value. Previously each recipe
// carried three hand-set numbers (input cost, cycle cost, output price) whose
// relationship to each other had drifted: the Refinery cost 800M to build and
// produced goods worth ~1,760, so it would have taken ~450,000 cycles to pay
// for itself.
function refined(id: string, name: string, mineral: string, amount: number, sym: string, color: string, time: number): RefineryRecipe {
  const inputValue = MINERAL_VALUE[MINERAL_RARITY[mineral]] * amount
  return {
    id, name,
    input: { mineral, amount },
    output: { name, sym, color, price: Math.round(inputValue * REFINING_VALUE_MULTIPLIER) },
    time,
    cost: Math.round(inputValue * REFINING_COST_RATE),
  }
}

export const REFINERY_RECIPES: RefineryRecipe[] = [
  refined('refined-gold', 'Refined Gold', 'gold', 3, 'Au+', '#ffd166', 3600),
  refined('refined-uranium', 'Refined Uranium', 'uranium', 3, 'U+', '#8fd16a', 3600),
  refined('refined-cobalt', 'Refined Cobalt', 'cobalt', 3, 'Co+', '#4f9cf7', 3000),
  refined('refined-copper', 'Refined Copper', 'copper', 4, 'Cu+', '#c9824b', 2400),
  refined('refined-aluminium', 'Refined Aluminium', 'aluminium', 4, 'Al+', '#c7d0dc', 2400),
  refined('refined-hydrogen', 'Refined Hydrogen', 'hydrogen', 4, 'H+', '#9becff', 1800),
]

export const STRUCTURES: StructureBlueprint[] = [
  { id: 'launchpad', name: 'Launchpad', kind: 'launchpad', cost: 0, unlocksAt: 'always', unlockTrigger: 'always', description: 'Rocket assembly and launch operations.' },
  {
    id: 'surface-silo',
    name: 'Surface Silo',
    kind: 'surface-silo',
    cost: SURFACE_SILO_PRICE,
    unlocksAt: 'Free Operations',
    unlockTrigger: 'free-operations',
    description: 'Small Earth-side mineral storage. Hold ore for a better market window or for refinery input.',
  },
  {
    id: 'refinery',
    name: 'Refinery',
    kind: 'refinery',
    cost: STRUCTURE_PRICES.refinery,
    costMaterials: { aluminium: 20, copper: 10 },
    unlocksAt: 'Free Operations',
    unlockTrigger: 'free-operations',
    // KES-283: Level 1 only — processes one shipment of raw ore into refined
    // goods per day (a queue, not instant conversion; see RefineryScreen /
    // REFINERY_RECIPES). No multi-level tree or advanced recipes yet.
    description: 'Level 1 ore processing. Refines one shipment of raw minerals into higher-value goods per day.',
  },
  {
    id: 'deep-space-telescope',
    name: 'Deep Space Telescope',
    kind: 'deep-space-telescope',
    cost: STRUCTURE_PRICES.deepSpaceTelescope,
    costMaterials: { aluminium: 30, copper: 16, silicon: 10 },
    unlocksAt: 'Free Operations',
    unlockTrigger: 'free-operations',
    description: 'Independent long-baseline instrument (STS-622) that downlinks unconfirmed NEO candidates from the Minor Planet Center for asteroid-discovery classification, separate from the transit satellite.',
  },
  {
    id: 'astronaut-academy',
    name: 'Astronaut Academy',
    kind: 'astronaut-academy',
    cost: STRUCTURE_PRICES.academy,
    costMaterials: { aluminium: 24, silicon: 12, copper: 8 },
    unlocksAt: 'Free Operations',
    unlockTrigger: 'free-operations',
    description: 'Trains named astronauts, manages the roster, and coordinates Base staffing.',
  },
  { id: 'garage', name: 'Vehicle Garage', kind: 'garage', cost: STRUCTURE_PRICES.garage, unlocksAt: 'Future sprint', unlockTrigger: 'manual', description: 'Surface rover maintenance and upgrades.' },
]

/** One-off cost to permanently upgrade the launchpad. Previously duplicated as
 *  a magic number in EconomySystem and as three hardcoded "₣1B" strings in
 *  HubScreen's copy, which could drift apart silently. */
export const LAUNCHPAD_UPGRADE_COST = STRUCTURE_PRICES.launchpadUpgrade

// When the story-deep-space-telescope-survey mission is offered (STS-622,
// KES-128): the transit satellite at level 2 and one client relationship at
// client level 2. It only decides when that mission appears; the telescope
// itself is an ordinary Free Operations purchase (see structureUnlocked).
export function deepSpaceTelescopeUnlocked(opts: { transitSatelliteLevel?: number; clientMissions?: Record<string, number> } = {}): boolean {
  if ((opts.transitSatelliteLevel ?? 1) < 2) return false
  return Object.values(opts.clientMissions ?? {}).some(
    jobs => 1 + Math.floor(Math.max(0, jobs) / CLIENT_AFFINITY_MISSION_THRESHOLD) >= 2
  )
}

/**
 * Structure availability. The tutorial teaches a fixed set of buildings (the
 * Launchpad); once it ends (Free Operations), every structure is open and only
 * its cost limits it. 'manual' blueprints have no Base building behind them
 * yet, so they stay unavailable. A structure already placed stays available.
 */
export function structureUnlocked(structure: StructureBlueprint, opts: { placed?: string[]; freeOperations?: boolean } = {}): boolean {
  if (structure.unlockTrigger === 'always') return true
  if (opts.placed?.includes(structure.id)) return true
  if (structure.unlockTrigger === 'manual') return false
  return !!opts.freeOperations
}

/** What a still-locked structure waits for, derived from the same rule so an
 *  older catalog row's unlocksAt copy cannot promise a retired gate. */
export function structureUnlockLabel(structure: StructureBlueprint): string {
  if (structure.unlockTrigger === 'manual') return structure.unlocksAt || 'Not yet available'
  return 'Free Operations'
}

export function canAffordStructure(structure: StructureBlueprint, opts: { francs: number; stash?: Record<string, number> }): boolean {
  if (opts.francs < structure.cost) return false
  return Object.entries(structure.costMaterials ?? {}).every(([mineral, amount]) => (opts.stash?.[mineral] ?? 0) >= amount)
}

// Card UI dims an unaffordable structure identically whether it's short on
// francs or short on a required mineral (e.g. Refinery's aluminium/copper),
// with no way for the player to tell which — this names the actual shortfall
// so the UI can surface it instead of a silent no-op.
export function structureAffordabilityGaps(structure: StructureBlueprint, opts: { francs: number; stash?: Record<string, number> }): string[] {
  const gaps: string[] = []
  if (opts.francs < structure.cost) gaps.push(`₣${(structure.cost - opts.francs).toLocaleString()} more`)
  for (const [mineral, amount] of Object.entries(structure.costMaterials ?? {})) {
    const held = opts.stash?.[mineral] ?? 0
    if (held < amount) gaps.push(`${amount - held} more ${mineral}`)
  }
  return gaps
}
