// Landnam game data — minerals

import type { MineralMeta, Mission } from './types'
import { MINERAL_VALUE, type MineralRarity } from './economy'

// Ore shapes are chosen so that every mineral pool an archetype can actually
// produce together (see ARCHETYPE_POOLS in target-archetypes.ts) has distinct
// shape+color pairs — several platinum-group metals share near-identical pale
// colors, so shape (not color) is what makes them tell-apart-able on screen.
// Prices come from the shared rarity bands in economy.ts rather than being
// hand-set per mineral: rarity is already the thing that tells a player how
// valuable an ore is, and 16 independently-tuned numbers spread 70× wide were
// what made common ore worthless once rare ore was worth anything at all.
export const MINERAL_META: Record<string, MineralMeta> = {
  // ── Early game (M1-M3) — platinum-group metals, genuinely rare on Earth ──────
  platinum:  { name: 'Platinum',  sym: 'Pt', color: '#e8e4d8', price: MINERAL_VALUE.rare, rarity: 'rare',   constructionUse: 'Catalytic nozzle coatings, fuel cells',      laserAccess: 1, shape: 'diamond' },
  palladium: { name: 'Palladium', sym: 'Pd', color: '#d4cce8', price: MINERAL_VALUE.rare, rarity: 'rare',   constructionUse: 'Hydrogen fuel cells, electronics',           laserAccess: 1, shape: 'circle' },
  iridium:   { name: 'Iridium',   sym: 'Ir', color: '#b8b4cc', price: MINERAL_VALUE.rare, rarity: 'rare',   constructionUse: 'High-temp alloys, ignition components',      laserAccess: 2, shape: 'triangle' },
  rhodium:   { name: 'Rhodium',   sym: 'Rh', color: '#f0e8d4', price: MINERAL_VALUE.exotic, rarity: 'exotic', constructionUse: 'Thruster lining, radiation-hard optics',     laserAccess: 2, shape: 'rect' },
  // ── Transition / M3+ ──────────────────────────────────────────────────────────
  gold:    { name: 'Gold',    sym: 'Au', color: '#ffd166', price: MINERAL_VALUE.rare, rarity: 'rare',   constructionUse: 'Circuitry, radiation shielding',               laserAccess: 2, shape: 'circle' },
  rare:    { name: 'Xenon',   sym: 'Xe', color: '#c084ff', price: MINERAL_VALUE.exotic, rarity: 'exotic', constructionUse: 'Quantum sensors, ion propellant',              laserAccess: 3, shape: 'diamond' },
  // ── Late game (Free Ops / orbital construction) — supply space infrastructure ─
  // earthAbundant minerals are plentiful in Earth's crust: it makes no sense
  // for a contract to ship them TO Earth, only to off-world construction
  // sites (see missionHasEarthDelivery / mineral-generator filtering).
  iron:      { name: 'Iron',      sym: 'Fe', color: '#d97150', price: MINERAL_VALUE.common, rarity: 'common',   constructionUse: 'Structural frames, smelting feedstock',  laserAccess: 1, earthAbundant: true, shape: 'circle' },
  silicon:   { name: 'Silicon',   sym: 'Si', color: '#b9d8ff', price: MINERAL_VALUE.common, rarity: 'common',   constructionUse: 'Electronics, solar panels',              laserAccess: 1, earthAbundant: true, shape: 'diamond' },
  ice:       { name: 'Ice',       sym: 'H2O', color: '#9becff', price: MINERAL_VALUE.uncommon, rarity: 'uncommon',  constructionUse: 'Propellant, life support',               laserAccess: 1, shape: 'circle' },
  carbon:    { name: 'Carbon',    sym: 'C',  color: '#6a7280', price: MINERAL_VALUE.common, rarity: 'common',   constructionUse: 'Composites, fuel',                        laserAccess: 1, earthAbundant: true, shape: 'rect' },
  nickel:    { name: 'Nickel',    sym: 'Ni', color: '#b0b8c4', price: MINERAL_VALUE.uncommon, rarity: 'uncommon',  constructionUse: 'Alloys, battery production',             laserAccess: 1, shape: 'diamond' },
  cobalt:    { name: 'Cobalt',    sym: 'Co', color: '#4f9cf7', price: MINERAL_VALUE.uncommon, rarity: 'uncommon',  constructionUse: 'Battery cathodes, superalloys',          laserAccess: 2, shape: 'triangle' },
  copper:    { name: 'Copper',    sym: 'Cu', color: '#c9824b', price: MINERAL_VALUE.common, rarity: 'common',   constructionUse: 'Conductors, heat exchangers, wiring',      laserAccess: 1, earthAbundant: true, shape: 'rect' },
  aluminium: { name: 'Aluminium', sym: 'Al', color: '#c7d0dc', price: MINERAL_VALUE.common, rarity: 'common',   constructionUse: 'Lightweight frames, tanks, trusses',      laserAccess: 1, earthAbundant: true, shape: 'rect' },
  hydrogen:  { name: 'Hydrogen',  sym: 'H',  color: '#9becff', price: MINERAL_VALUE.uncommon, rarity: 'uncommon', constructionUse: 'Propellant, reactor feedstock',           laserAccess: 1, shape: 'triangle' },
  uranium:   { name: 'Uranium',   sym: 'U',  color: '#8fd16a', price: MINERAL_VALUE.rare, rarity: 'rare',     constructionUse: 'Compact power systems, shielding',        laserAccess: 2, shape: 'triangle' },
}

/** Rarity band per mineral, for anything pricing against MINERAL_VALUE. */
export const MINERAL_RARITY: Record<string, MineralRarity> = Object.fromEntries(
  Object.entries(MINERAL_META).map(([id, meta]) => [id, meta.rarity as MineralRarity]),
)

export const MINERAL_COLORS: Record<string, string> = {
  platinum:  '#e8e4d8',
  palladium: '#d4cce8',
  iridium:   '#b8b4cc',
  rhodium:   '#f0e8d4',
  gold:      '#ffd166',
  rare:      '#c084ff',
  iron:      '#d97150',
  silicon:   '#b9d8ff',
  ice:       '#9becff',
  carbon:    '#6a7280',
  nickel:    '#b0b8c4',
  cobalt:    '#4f9cf7',
  copper:    '#c9824b',
  aluminium: '#c7d0dc',
  hydrogen:  '#9becff',
  uranium:   '#8fd16a',
}

export function sellCargo(cargo: Record<string, number>, minerals: Record<string, MineralMeta> = MINERAL_META): number {
  return Object.entries(cargo).reduce((sum, [k, v]) => {
    const meta = minerals[k]
    return sum + (meta ? meta.price * v : 0)
  }, 0)
}

export function rateMission(opts: {
  mission: Mission | null
  cargo: Record<string, number>
  elapsed: number
}): number {
  if (!opts.mission) return 0
  const reqMet = Object.entries(opts.mission.requires.minerals).every(
    ([k, v]) => (opts.cargo[k] ?? 0) >= v
  )
  if (!reqMet) return 1
  return opts.elapsed < 30 ? 3 : opts.elapsed < 60 ? 2 : 1
}
