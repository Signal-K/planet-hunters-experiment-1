// Landnam game data — structures, refinery recipes, market templates

import type { StructureBlueprint, RefineryRecipe, MarketTemplate } from './types'
import { MINERAL_VALUE, REFINING_COST_RATE, REFINING_VALUE_MULTIPLIER, STRUCTURE_PRICES } from './economy'
import { MINERAL_RARITY } from './minerals'

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
    id: 'refinery',
    name: 'Refinery',
    kind: 'refinery',
    cost: STRUCTURE_PRICES.refinery,
    costMaterials: { aluminium: 20, copper: 10 },
    unlocksAt: 'First client mission requiring refined minerals',
    unlockTrigger: 'client-mission-trigger',
    description: 'Refines raw minerals into higher-value client-grade materials.',
  },
  {
    id: 'scan-station',
    name: 'Scanning Station',
    kind: 'scan-station',
    cost: 0,
    unlocksAt: 'Free Operations',
    unlockTrigger: 'always',
    description: 'Scans remote targets to map mineral deposits, craters, and landmarks. Up to 5 scans per day, 10 minutes each.',
  },
  {
    id: 'satellite-monitoring-station',
    name: 'Satellite Monitoring Station',
    kind: 'satellite-monitoring-station',
    cost: 0,
    unlocksAt: 'Free Operations',
    unlockTrigger: 'always',
    description: 'Monitors player-launched transit telescopes and downlinks daily TESS-style candidates for classification.',
  },
  { id: 'garage', name: 'Vehicle Garage', kind: 'garage', cost: STRUCTURE_PRICES.garage, unlocksAt: 'Future sprint', unlockTrigger: 'manual', description: 'Surface rover maintenance and upgrades.' },
]

/** One-off cost to permanently upgrade the launchpad. Previously duplicated as
 *  a magic number in EconomySystem and as three hardcoded "₣1B" strings in
 *  HubScreen's copy, which could drift apart silently. */
export const LAUNCHPAD_UPGRADE_COST = STRUCTURE_PRICES.launchpadUpgrade

export const SCANS_PER_DAY = 5
export const SCAN_DURATION_MS = 10 * 60 * 1000
export const SCANS_REQUIRED_TO_MAP = 3

export function structureUnlocked(structure: StructureBlueprint, opts: { refineryUnlocked?: boolean; placed?: string[]; freeOperations?: boolean } = {}): boolean {
  if (structure.id === 'scan-station') return !!opts.freeOperations
  if (structure.id === 'satellite-monitoring-station') return !!opts.freeOperations
  if (structure.unlockTrigger === 'always') return true
  if (structure.id === 'refinery') return !!opts.refineryUnlocked || !!opts.placed?.includes('refinery')
  return false
}

export function canAffordStructure(structure: StructureBlueprint, opts: { francs: number; stash?: Record<string, number> }): boolean {
  if (opts.francs < structure.cost) return false
  return Object.entries(structure.costMaterials ?? {}).every(([mineral, amount]) => (opts.stash?.[mineral] ?? 0) >= amount)
}

export const MARKET_TEMPLATES: MarketTemplate[] = [
  { id: 'spot',     label: 'Spot Price',     currency: '₣', baseRate: 1.0, volatility: 0.05 },
  { id: 'futures',  label: 'Futures Contract', currency: '₣', baseRate: 0.92, volatility: 0.02 },
  { id: 'bulk',     label: 'Bulk Rate',       currency: '₣', baseRate: 0.85, volatility: 0.08 },
]
