// Landnam game data — structures, refinery recipes, market templates

import type { StructureBlueprint, RefineryRecipe, MarketTemplate } from './types'

export const REFINERY_RECIPES: RefineryRecipe[] = [
  { id: 'refined-gold', name: 'Refined Gold', input: { mineral: 'gold', amount: 3 }, output: { name: 'Refined Gold', sym: 'Au+', color: '#ffd166', price: 1760 }, time: 3600, cost: 100000 },
  { id: 'refined-uranium', name: 'Refined Uranium', input: { mineral: 'uranium', amount: 3 }, output: { name: 'Refined Uranium', sym: 'U+', color: '#8fd16a', price: 3000 }, time: 3600, cost: 150000 },
  { id: 'refined-cobalt', name: 'Refined Cobalt', input: { mineral: 'cobalt', amount: 3 }, output: { name: 'Refined Cobalt', sym: 'Co+', color: '#4f9cf7', price: 855 }, time: 3000, cost: 80000 },
  { id: 'refined-copper', name: 'Refined Copper', input: { mineral: 'copper', amount: 4 }, output: { name: 'Refined Copper', sym: 'Cu+', color: '#c9824b', price: 442 }, time: 2400, cost: 60000 },
  { id: 'refined-aluminium', name: 'Refined Aluminium', input: { mineral: 'aluminium', amount: 4 }, output: { name: 'Refined Aluminium', sym: 'Al+', color: '#c7d0dc', price: 336 }, time: 2400, cost: 60000 },
  { id: 'refined-hydrogen', name: 'Refined Hydrogen', input: { mineral: 'hydrogen', amount: 4 }, output: { name: 'Refined Hydrogen', sym: 'H+', color: '#9becff', price: 280 }, time: 1800, cost: 50000 },
]

export const STRUCTURES: StructureBlueprint[] = [
  { id: 'launchpad', name: 'Launchpad', kind: 'launchpad', cost: 0, unlocksAt: 'always', unlockTrigger: 'always', description: 'Rocket assembly and launch operations.' },
  {
    id: 'refinery',
    name: 'Refinery',
    kind: 'refinery',
    cost: 800_000_000,
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
  { id: 'garage', name: 'Vehicle Garage', kind: 'garage', cost: 600_000_000, unlocksAt: 'Future sprint', unlockTrigger: 'manual', description: 'Surface rover maintenance and upgrades.' },
]

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
