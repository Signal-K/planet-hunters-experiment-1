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
    // SSL-332: building it is the last guided step, and it is what opens Free Ops.
    unlocksAt: 'Complete the guided missions',
    unlockTrigger: 'onboarding-missions',
    description: 'Small Earth-side mineral storage. Hold ore for a better market window or for refinery input.',
  },
  {
    id: 'refinery',
    name: 'Refinery',
    kind: 'refinery',
    cost: STRUCTURE_PRICES.refinery,
    costMaterials: { aluminium: 20, copper: 10 },
    unlocksAt: 'Surface Silo + an established mining settlement',
    unlockTrigger: 'free-operations',
    // KES-283: Level 1 only — processes one shipment of raw ore into refined
    // goods per day (a queue, not instant conversion; see RefineryScreen /
    // REFINERY_RECIPES). No multi-level tree or advanced recipes yet.
    //
    // SSL-74: gated on the Surface Silo (refining needs somewhere to hold
    // input ore) plus an established off-world mining settlement (purchased
    // site access — see SurfaceOpsSystem/applyPurchaseSiteAccess). A
    // settlement lets a ferry bring home a full hold in one trip instead of
    // repeated one-off mining runs; refining is the payoff for having made
    // that investment, not a plain Free-Ops purchase.
    description: 'Level 1 ore processing. Refines one shipment of raw minerals into higher-value goods per day. Requires a Surface Silo for input storage and an established mining settlement — settlements ferry ore home in bulk, giving the Refinery a steady supply instead of one-off mining runs.',
  },
  {
    id: 'astronaut-academy',
    name: 'Astronaut Academy',
    kind: 'astronaut-academy',
    cost: STRUCTURE_PRICES.academy,
    costMaterials: { aluminium: 24, silicon: 12, copper: 8 },
    unlocksAt: 'Research after reaching client level 2 with two clients',
    unlockTrigger: 'academy-research',
    description: 'Trains named astronauts, manages the roster, and coordinates Base staffing.',
  },
  { id: 'garage', name: 'Vehicle Garage', kind: 'garage', cost: STRUCTURE_PRICES.garage, unlocksAt: 'Future sprint', unlockTrigger: 'manual', description: 'Surface rover maintenance and upgrades.' },
]

/** One-off cost to permanently upgrade the launchpad. Previously duplicated as
 *  a magic number in EconomySystem and as three hardcoded "₣1B" strings in
 *  HubScreen's copy, which could drift apart silently. */
export const LAUNCHPAD_UPGRADE_COST = STRUCTURE_PRICES.launchpadUpgrade

export function structureUnlocked(structure: StructureBlueprint, opts: { refineryUnlocked?: boolean; academyResearched?: boolean; placed?: string[]; freeOperations?: boolean; missionsDone?: number; hasMiningSettlement?: boolean } = {}): boolean {
  // SSL-332's storage silo is the only pre-Free-Ops construction step: it
  // becomes available after Extraction and Transport, and placement opens
  // Free Ops. Existing players retain access through their saved unlock.
  if (structure.id === 'surface-silo') return !!opts.freeOperations || (opts.missionsDone ?? 0) >= FREE_OPS_START_MISSIONS_DONE || !!opts.placed?.includes('surface-silo')
  if (structure.id === 'astronaut-academy') return !!opts.academyResearched || !!opts.placed?.includes('astronaut-academy')
  if (structure.unlockTrigger === 'always') return true
  // KES-283: the Refinery is a normal Earth Base plot purchase (same unlock
  // shape as the Surface Silo) rather than the KES-286 off-world
  // site-commissioned structure whose unlock condition no mission ever
  // satisfied — that broken trigger is retired for good.
  //
  // SSL-332 makes this an immediate Free Ops activity. The storage silo is
  // the prerequisite because it provides the refinery's input buffer; an
  // off-world settlement remains useful later, but is not a dead-end gate.
  if (structure.id === 'refinery') {
    return !!opts.placed?.includes('refinery')
      || (!!opts.freeOperations && !!opts.placed?.includes('surface-silo'))
  }
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
