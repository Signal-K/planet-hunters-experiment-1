// Landnam game data — structures, refinery recipes, market templates

import type { StructureBlueprint, RefineryRecipe, MarketTemplate } from './types'
import { MINERAL_VALUE, REFINING_COST_RATE, REFINING_VALUE_MULTIPLIER, STRUCTURE_PRICES, SURFACE_SILO_PRICE } from './economy'
import { MINERAL_RARITY } from './minerals'
import { FREE_OPS_START_MISSIONS_DONE } from './mission-generator'

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
  refined('refined-gold', 'Refined Gold', 'gold', 3, 'Au+', '#79d1ec', 3600),
  refined('refined-uranium', 'Refined Uranium', 'uranium', 3, 'U+', '#8fd16a', 3600),
  refined('refined-cobalt', 'Refined Cobalt', 'cobalt', 3, 'Co+', '#4f9cf7', 3000),
  refined('refined-copper', 'Refined Copper', 'copper', 4, 'Cu+', '#4bc9c6', 2400),
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
    // SSL-332: building it is the last guided step, and it is what opens Free Ops.
    unlocksAt: 'Fly both guided missions first',
    unlockTrigger: 'onboarding-missions',
    description: 'Small Earth-side mineral storage. Keep ore for construction; overflow is sold when a flight returns.',
  },
  {
    id: 'market',
    name: 'Exchange',
    kind: 'market',
    cost: STRUCTURE_PRICES.exchange,
    // Optional: players choose to build it once they are trading on their own.
    unlocksAt: 'Opens once the guided missions are flown',
    unlockTrigger: 'onboarding-missions',
    description: 'Cargo dock where you sell ore at the spot price.',
  },
  {
    id: 'control-station',
    name: 'Control Station',
    kind: 'control-station',
    cost: STRUCTURE_PRICES.controlStation,
    // Satellites and telescopes are run from here, so it comes before the first launch of either.
    unlocksAt: 'Opens once the guided missions are flown',
    unlockTrigger: 'onboarding-missions',
    description: 'Runs your satellites and telescopes. Build it before you launch one.',
  },
]

/** One-off cost to permanently upgrade the launchpad. Previously duplicated as
 *  a magic number in EconomySystem and as three hardcoded "₣1B" strings in
 *  HubScreen's copy, which could drift apart silently. */
export const LAUNCHPAD_UPGRADE_COST = STRUCTURE_PRICES.launchpadUpgrade

/** Silo and Exchange appear once one run has been flown: before that there is no ore to store or sell, and they cost
 *  a fifth of the starting francs. (Free Ops itself opens with the launchpad.) */
export const FIRST_STORAGE_MISSIONS_DONE = 1

export function structureUnlocked(structure: StructureBlueprint, opts: { refineryUnlocked?: boolean; placed?: string[]; freeOperations?: boolean; missionsDone?: number; hasMiningSettlement?: boolean } = {}): boolean {
  // SSL-332's storage silo is the only pre-Free-Ops construction step: it
  // becomes available after Extraction and Transport, and placement opens
  // Free Ops. Existing players retain access through their saved unlock.
  if (structure.id === 'surface-silo') return (opts.missionsDone ?? 0) >= FIRST_STORAGE_MISSIONS_DONE || !!opts.placed?.includes('surface-silo')
  if (structure.id === 'market') return (opts.missionsDone ?? 0) >= FIRST_STORAGE_MISSIONS_DONE || !!opts.placed?.includes('market')
  if (structure.id === 'control-station') return (opts.missionsDone ?? 0) >= FIRST_STORAGE_MISSIONS_DONE || !!opts.placed?.includes('control-station')
  if (structure.unlockTrigger === 'always') return true
  return false
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

export const MARKET_TEMPLATES: MarketTemplate[] = [
  { id: 'spot',     label: 'Spot Price',     currency: '₣', baseRate: 1.0, volatility: 0.05 },
  { id: 'futures',  label: 'Futures Contract', currency: '₣', baseRate: 0.92, volatility: 0.02 },
  { id: 'bulk',     label: 'Bulk Rate',       currency: '₣', baseRate: 0.85, volatility: 0.08 },
]
