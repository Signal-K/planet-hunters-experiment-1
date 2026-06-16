// Landnam game data — structures, refinery recipes, market templates

import type { StructureBlueprint, RefineryRecipe, MarketTemplate } from './types'

export const REFINERY_RECIPES: RefineryRecipe[] = [
  { id: 'refine-steel', name: 'Smelt Steel', input: { mineral: 'iron', amount: 4 }, output: { name: 'Steel Beam', sym: 'FeS', color: '#b0b8c4', price: 600 }, time: 30, cost: 50000 },
  { id: 'refine-wafer', name: 'Fabricate Wafers', input: { mineral: 'silicon', amount: 3 }, output: { name: 'Silicon Wafer', sym: 'SiW', color: '#7ec8ff', price: 900 }, time: 45, cost: 75000 },
  { id: 'refine-goldbar', name: 'Cast Gold Bars', input: { mineral: 'gold', amount: 3 }, output: { name: 'Gold Bar', sym: 'AuB', color: '#ffd166', price: 3200 }, time: 60, cost: 100000 },
  { id: 'refine-xe', name: 'Compress Xenon', input: { mineral: 'rare', amount: 2 }, output: { name: 'Xenon Canister', sym: 'XeC', color: '#c084ff', price: 6000 }, time: 90, cost: 150000 },
  { id: 'refine-nickel', name: 'Purify Nickel', input: { mineral: 'nickel', amount: 4 }, output: { name: 'Nickel Alloy', sym: 'NiA', color: '#b0b8c4', price: 500 }, time: 25, cost: 40000 },
  { id: 'refine-cobalt', name: 'Refine Cobalt', input: { mineral: 'cobalt', amount: 3 }, output: { name: 'Cobalt Cathode', sym: 'CoC', color: '#4f9cf7', price: 1800 }, time: 50, cost: 80000 },
]

export const STRUCTURES: StructureBlueprint[] = [
  { id: 'launchpad', name: 'Launchpad',     kind: 'launchpad', cost: 0,          unlocksAt: 'always',      description: 'Rocket assembly and launch operations.' },
  { id: 'control',   name: 'Control Base',  kind: 'control',   cost: 500_000_000, unlocksAt: 'After M1',     description: 'Mission control center — unlocks contract board.' },
  { id: 'satellite', name: 'Satellite Uplink', kind: 'satellite', cost: 1_200_000_000, unlocksAt: 'Tier 2',   description: 'Orbital relay for deep-space comms.' },
  { id: 'refinery',  name: 'Refinery',      kind: 'refinery',  cost: 800_000_000,  unlocksAt: 'Tier 2',     description: 'On-site ore processing increases sale price.' },
  { id: 'garage',    name: 'Vehicle Garage', kind: 'garage',    cost: 600_000_000,  unlocksAt: 'Tier 2',     description: 'Surface rover maintenance and upgrades.' },
]

export const MARKET_TEMPLATES: MarketTemplate[] = [
  { id: 'spot',     label: 'Spot Price',     currency: '₣', baseRate: 1.0, volatility: 0.05 },
  { id: 'futures',  label: 'Futures Contract', currency: '₣', baseRate: 0.92, volatility: 0.02 },
  { id: 'bulk',     label: 'Bulk Rate',       currency: '₣', baseRate: 0.85, volatility: 0.08 },
]
