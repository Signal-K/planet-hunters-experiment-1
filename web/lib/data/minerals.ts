// Landnam game data — minerals

import type { MineralMeta, Mission } from './types'

export const MINERAL_META: Record<string, MineralMeta> = {
  // ── Early game (M1-M3) — platinum-group metals, genuinely rare on Earth ──────
  platinum:  { name: 'Platinum',  sym: 'Pt', color: '#e8e4d8', price: 1000,  rarity: 'rare',   constructionUse: 'Catalytic nozzle coatings, fuel cells',      laserAccess: 1 },
  palladium: { name: 'Palladium', sym: 'Pd', color: '#d4cce8', price: 1400,  rarity: 'rare',   constructionUse: 'Hydrogen fuel cells, electronics',           laserAccess: 1 },
  iridium:   { name: 'Iridium',   sym: 'Ir', color: '#b8b4cc', price: 2600,  rarity: 'rare',   constructionUse: 'High-temp alloys, ignition components',      laserAccess: 2 },
  rhodium:   { name: 'Rhodium',   sym: 'Rh', color: '#f0e8d4', price: 4200,  rarity: 'exotic', constructionUse: 'Thruster lining, radiation-hard optics',     laserAccess: 2 },
  // ── Transition / M3+ ──────────────────────────────────────────────────────────
  gold:    { name: 'Gold',    sym: 'Au', color: '#ffd166', price: 800,   rarity: 'rare',   constructionUse: 'Circuitry, radiation shielding',               laserAccess: 2 },
  rare:    { name: 'Xenon',   sym: 'Xe', color: '#c084ff', price: 2000,  rarity: 'exotic', constructionUse: 'Quantum sensors, ion propellant',              laserAccess: 3 },
  // ── Late game (Free Ops / orbital construction) — supply space infrastructure ─
  // earthAbundant minerals are plentiful in Earth's crust: it makes no sense
  // for a contract to ship them TO Earth, only to off-world construction
  // sites (see missionHasEarthDelivery / mineral-generator filtering).
  iron:      { name: 'Iron',      sym: 'Fe', color: '#d97150', price: 120,   rarity: 'common',   constructionUse: 'Structural frames, smelting feedstock',  laserAccess: 1, earthAbundant: true },
  silicon:   { name: 'Silicon',   sym: 'Si', color: '#b9d8ff', price: 180,   rarity: 'common',   constructionUse: 'Electronics, solar panels',              laserAccess: 1, earthAbundant: true },
  ice:       { name: 'Ice',       sym: 'H2O', color: '#9becff', price: 90,  rarity: 'uncommon',  constructionUse: 'Propellant, life support',               laserAccess: 1 },
  carbon:    { name: 'Carbon',    sym: 'C',  color: '#6a7280', price: 60,   rarity: 'common',   constructionUse: 'Composites, fuel',                        laserAccess: 1, earthAbundant: true },
  nickel:    { name: 'Nickel',    sym: 'Ni', color: '#b0b8c4', price: 150,  rarity: 'uncommon',  constructionUse: 'Alloys, battery production',             laserAccess: 1 },
  cobalt:    { name: 'Cobalt',    sym: 'Co', color: '#4f9cf7', price: 450,  rarity: 'uncommon',  constructionUse: 'Battery cathodes, superalloys',          laserAccess: 2 },
  copper:    { name: 'Copper',    sym: 'Cu', color: '#c9824b', price: 260,  rarity: 'common',   constructionUse: 'Conductors, heat exchangers, wiring',      laserAccess: 1, earthAbundant: true },
  aluminium: { name: 'Aluminium', sym: 'Al', color: '#c7d0dc', price: 210,  rarity: 'common',   constructionUse: 'Lightweight frames, tanks, trusses',      laserAccess: 1, earthAbundant: true },
  hydrogen:  { name: 'Hydrogen',  sym: 'H',  color: '#9becff', price: 140,  rarity: 'uncommon', constructionUse: 'Propellant, reactor feedstock',           laserAccess: 1 },
  uranium:   { name: 'Uranium',   sym: 'U',  color: '#8fd16a', price: 1200, rarity: 'rare',     constructionUse: 'Compact power systems, shielding',        laserAccess: 2 },
}

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
