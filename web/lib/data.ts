// Landnam game data — missions, targets, parts, tutorial steps

export interface Mission {
  id: string
  title: string
  brief: string
  contractor: string
  tag: string
  difficulty: string
  locked: boolean
  sequence: number
  requiresClassification?: boolean
  unlockAt?: string
  requires: {
    minerals: Record<string, number>
    cargo_min: number
    drill_tier: number
    max_orbit: number
  }
  payout: {
    francs: number
    affinity: number
  }
}

export interface Target {
  id: string
  name: string
  type: 'planet' | 'asteroid'
  orbit: number
  difficulty: string
  brief: string
  minerals: string[]
  recommended?: boolean
}

export interface Part {
  id: string
  name: string
  tier: number
  locked: boolean
  img: string
  // chassis
  mass?: number
  cargo?: number
  // propulsion
  power?: number
  max_orbit?: number
  // drill
  rate?: number
  missionsRequired?: number
}

export interface MineralMeta {
  name: string
  sym: string
  color: string
  price: number
  rarity: 'common' | 'uncommon' | 'rare' | 'exotic'
  constructionUse: string
  laserAccess: number
}

export interface Contractor {
  id: string
  name: string
  color: string
  initial: string
}

export interface ContractorSlot {
  id: string
  name: string
  color: string
  initial: string
  unlockTier: number
  projectType: string
  mineralPreferences: string[]
  payoutNotes: string
  affinityNotes: string
  uiRole: 'starter' | 'bulk' | 'prospect' | 'command' | 'science'
}

export interface StructureBlueprint {
  id: string
  name: string
  kind: string
  cost: number
  unlocksAt: string
  description: string
}

export interface MarketTemplate {
  id: string
  label: string
  currency: string
  baseRate: number
  volatility: number
}

export interface MissionTemplate {
  id: string
  tag: string
  difficulty: string
  mineralKeys: string[]
  cargoRange: [number, number]
  drillTierMin: number
  orbitMax: number
  payoutMultiplier: number
  contractorRole: ContractorSlot['uiRole']
  payoutFormula: string
}

export const CONTRACTOR_SLOTS: ContractorSlot[] = [
  { id: 'contractor-03a', name: 'Contractor Slot 03A', color: '#d97150', initial: '3A', unlockTier: 3, projectType: 'Starter smelting throughput', mineralPreferences: ['iron', 'silicon'], payoutNotes: 'Low rate, steady volume', affinityNotes: '+10 per delivery', uiRole: 'starter' },
  { id: 'contractor-03b', name: 'Contractor Slot 03B', color: '#9becff', initial: '3B', unlockTier: 3, projectType: 'Volatile handling', mineralPreferences: ['ice', 'carbon'], payoutNotes: 'Medium pay, bulk orders', affinityNotes: '+8 per delivery', uiRole: 'bulk' },
  { id: 'contractor-04a', name: 'Contractor Slot 04A', color: '#ffd166', initial: '4A', unlockTier: 4, projectType: 'Precious-metal assay', mineralPreferences: ['gold', 'nickel'], payoutNotes: 'High pay, low volume', affinityNotes: '+15 per delivery', uiRole: 'prospect' },
  { id: 'contractor-04b', name: 'Contractor Slot 04B', color: '#a8d8ea', initial: '4B', unlockTier: 4, projectType: 'Construction aggregates', mineralPreferences: ['iron', 'carbon'], payoutNotes: 'Low rate, large orders', affinityNotes: '+6 per delivery', uiRole: 'bulk' },
  { id: 'contractor-06a', name: 'Contractor Slot 06A', color: '#70e070', initial: '6A', unlockTier: 6, projectType: 'Deep-core sampling', mineralPreferences: ['nickel', 'cobalt'], payoutNotes: 'Mixed-bag premium', affinityNotes: '+12 per delivery', uiRole: 'prospect' },
  { id: 'contractor-06b', name: 'Contractor Slot 06B', color: '#c084ff', initial: '6B', unlockTier: 6, projectType: 'Rare-gas refining', mineralPreferences: ['rare', 'gold'], payoutNotes: 'High tier, small batches', affinityNotes: '+20 per delivery', uiRole: 'command' },
  { id: 'contractor-08a', name: 'Contractor Slot 08A', color: '#ff8c42', initial: '8A', unlockTier: 8, projectType: 'Solar-grade silicon', mineralPreferences: ['silicon', 'ice'], payoutNotes: 'Premium purity contracts', affinityNotes: '+10 per delivery', uiRole: 'command' },
  { id: 'contractor-08b', name: 'Contractor Slot 08B', color: '#5fcde6', initial: '8B', unlockTier: 8, projectType: 'Outer-belt volatiles', mineralPreferences: ['ice', 'carbon'], payoutNotes: 'Medium rate, special cargo', affinityNotes: '+8 per delivery', uiRole: 'bulk' },
  { id: 'contractor-10a', name: 'Contractor Slot 10A', color: '#f5a623', initial: '10A', unlockTier: 10, projectType: 'Strategic minerals', mineralPreferences: ['gold', 'rare', 'cobalt'], payoutNotes: 'High payout, rare minerals', affinityNotes: '+25 per delivery', uiRole: 'science' },
  { id: 'contractor-10b', name: 'Contractor Slot 10B', color: '#39d36a', initial: '10B', unlockTier: 10, projectType: 'Base expansion reserves', mineralPreferences: ['iron', 'silicon', 'nickel'], payoutNotes: 'Balanced late-game contracts', affinityNotes: '+12 per delivery', uiRole: 'starter' },
]

export interface RefineryRecipe {
  id: string
  name: string
  input: { mineral: string; amount: number }
  output: { name: string; sym: string; color: string; price: number }
  time: number
  cost: number
}

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

export const MISSION_TEMPLATES: MissionTemplate[] = [
  { id: 'starter-bulk', tag: 'STARTER', difficulty: 'L1', mineralKeys: ['iron', 'silicon', 'carbon'], cargoRange: [4, 8], drillTierMin: 1, orbitMax: 4, payoutMultiplier: 1.0, contractorRole: 'starter', payoutFormula: 'mineral price * amount * 1500 * multiplier' },
  { id: 'volatile-bulk', tag: 'BULK', difficulty: 'L2', mineralKeys: ['ice', 'carbon', 'silicon'], cargoRange: [8, 14], drillTierMin: 1, orbitMax: 5, payoutMultiplier: 1.35, contractorRole: 'bulk', payoutFormula: 'mineral price * amount * 1500 * multiplier' },
  { id: 'metal-prospect', tag: 'PROSPECT', difficulty: 'L2', mineralKeys: ['nickel', 'cobalt', 'gold'], cargoRange: [3, 8], drillTierMin: 2, orbitMax: 5, payoutMultiplier: 2.25, contractorRole: 'prospect', payoutFormula: 'mineral price * amount * 1500 * multiplier' },
  { id: 'command-reserve', tag: 'COMMAND', difficulty: 'L3', mineralKeys: ['gold', 'rare', 'cobalt'], cargoRange: [3, 6], drillTierMin: 2, orbitMax: 6, payoutMultiplier: 3.5, contractorRole: 'command', payoutFormula: 'mineral price * amount * 1500 * multiplier' },
]

const SEED_MINERAL_PRICES: Record<string, number> = {
  iron: 120,
  silicon: 180,
  carbon: 60,
  ice: 90,
  nickel: 150,
  cobalt: 450,
  gold: 800,
  rare: 2000,
}

interface ResourceMissionSeed {
  id: string
  title: string
  brief: string
  contractor: string
  template: string
  sequence: number
  minerals: Record<string, number>
  locked: boolean
  unlockAt?: string
  affinity: number
}

const RESOURCE_MISSION_SEEDS: ResourceMissionSeed[] = [
  { id: 'm1-iron', title: 'Iron Reserve Order', brief: 'Contractor Slot 03A needs a starter iron shipment from a reachable asteroid.', contractor: 'contractor-03a', template: 'starter-bulk', sequence: 1, minerals: { iron: 6 }, locked: false, affinity: 10 },
  { id: 'm2-silicon', title: 'Silicon Bulk Order', brief: 'Contractor Slot 03B needs raw silicon for electronics-grade supply contracts.', contractor: 'contractor-03b', template: 'volatile-bulk', sequence: 2, minerals: { silicon: 8 }, locked: false, unlockAt: 'Complete M1', affinity: 8 },
  { id: 'm3-nickel-cobalt', title: 'Nickel-Cobalt Assay', brief: 'Contractor Slot 04A wants battery metals from confirmed belt targets only.', contractor: 'contractor-04a', template: 'metal-prospect', sequence: 3, minerals: { nickel: 4, cobalt: 2 }, locked: true, unlockAt: 'Complete M2', affinity: 15 },
  { id: 'm4-gold-reserve', title: 'Gold Reserve Run', brief: 'Contractor Slot 04B has a premium gold order from the main belt.', contractor: 'contractor-04b', template: 'command-reserve', sequence: 4, minerals: { gold: 4 }, locked: true, unlockAt: 'Complete M3', affinity: 20 },
]

function buildResourceMission(seed: ResourceMissionSeed): Mission {
  const template = MISSION_TEMPLATES.find(t => t.id === seed.template) ?? MISSION_TEMPLATES[0]
  const cargoMin = Object.values(seed.minerals).reduce((sum, amount) => sum + amount, 0)
  const francs = Object.entries(seed.minerals).reduce(
    (sum, [mineral, amount]) => sum + (SEED_MINERAL_PRICES[mineral] ?? 0) * amount * 1500 * template.payoutMultiplier,
    0
  )

  return {
    id: seed.id,
    title: seed.title,
    brief: seed.brief,
    contractor: seed.contractor,
    tag: template.tag,
    difficulty: template.difficulty,
    locked: seed.locked,
    sequence: seed.sequence,
    unlockAt: seed.unlockAt,
    requires: {
      minerals: seed.minerals,
      cargo_min: cargoMin,
      drill_tier: template.drillTierMin,
      max_orbit: template.orbitMax,
    },
    payout: { francs, affinity: seed.affinity },
  }
}

export interface Star {
  id: string
  name: string
  x: number
  y: number
  kind: string
  dist: string
}

export interface TutorialStep {
  id: number
  screen: string
  title: string
  body: string
  action?: string
  manual?: boolean
  anchor: 'top' | 'bottom' | 'center'
  spot: { x: number; y: number; w: number; h: number } | null
  cta: string
}

export const CONTRACTORS: Record<string, Contractor> = Object.fromEntries(
  CONTRACTOR_SLOTS.map(c => [c.id, { id: c.id, name: c.name, color: c.color, initial: c.initial }])
)

export const MISSIONS: Mission[] = RESOURCE_MISSION_SEEDS.map(buildResourceMission)

export const TARGETS: Target[] = [
  // ── Inner solar system planets ─────────────────────────────────────────────
  {
    id: 'mercury',
    name: 'Mercury',
    type: 'planet',
    orbit: 1,
    difficulty: 'L2',
    brief: 'Scorched inner planet, rich in iron and trace silicates.',
    minerals: ['iron', 'silicon'],
  },
  {
    id: 'mars',
    name: 'Mars',
    type: 'planet',
    orbit: 4,
    difficulty: 'L1',
    brief: 'Iron-rich rusty plains, well-mapped, starter-friendly.',
    minerals: ['iron', 'silicon'],
    recommended: true,
  },
  // ── Near-Earth and inner belt asteroids (orbit 1–4) ────────────────────────
  {
    id: 'eros',
    name: '433 Eros',
    type: 'asteroid',
    orbit: 2,
    difficulty: 'L1',
    brief: 'Elongated near-Earth rock with dense iron-nickel core. First commercial prospect on file.',
    minerals: ['iron', 'silicon'],
    recommended: true,
  },
  {
    id: 'vesta',
    name: '4 Vesta',
    type: 'asteroid',
    orbit: 3,
    difficulty: 'L1',
    brief: 'Differentiated protoplanet. Basaltic crust over a heavy iron mantle.',
    minerals: ['iron', 'silicon'],
  },
  {
    id: 'itokawa',
    name: '25143 Itokawa',
    type: 'asteroid',
    orbit: 2,
    difficulty: 'L1',
    brief: 'Stony near-Earth rubble pile with accessible nickel-iron traces.',
    minerals: ['iron', 'nickel'],
  },
  {
    id: 'ryugu',
    name: '162173 Ryugu',
    type: 'asteroid',
    orbit: 3,
    difficulty: 'L1',
    brief: 'Carbonaceous near-Earth asteroid with hydrated minerals and dark regolith.',
    minerals: ['carbon', 'ice'],
  },
  {
    id: 'psyche',
    name: '16 Psyche',
    type: 'asteroid',
    orbit: 4,
    difficulty: 'L2',
    brief: 'Exposed metallic core of an ancient body. Extremely high iron and nickel grades.',
    minerals: ['iron', 'nickel', 'gold'],
  },
  {
    id: 'bennu',
    name: '101955 Bennu',
    type: 'asteroid',
    orbit: 2,
    difficulty: 'L1',
    brief: 'Carbon-rich near-Earth asteroid. Loose rubble pile, low gravity, easy approach.',
    minerals: ['iron', 'carbon'],
  },
  // ── Main belt / outer (orbit 5+) ───────────────────────────────────────────
  {
    id: 'belt',
    name: 'Asteroid Belt',
    type: 'asteroid',
    orbit: 5,
    difficulty: 'L2',
    brief: 'Varied deposits: iron, silicon, nickel, cobalt, gold, and xenon pockets. The prospector\'s playground.',
    minerals: ['iron', 'silicon', 'nickel', 'cobalt', 'gold', 'rare'],
    recommended: true,
  },
  {
    id: 'ceres',
    name: '1 Ceres',
    type: 'asteroid',
    orbit: 5,
    difficulty: 'L2',
    brief: 'Dwarf planet at the belt\'s inner edge. Ice-rich mantle beneath a silicate crust.',
    minerals: ['ice', 'silicon'],
  },
  // ── Outer planets ──────────────────────────────────────────────────────────
  {
    id: 'jupiter',
    name: 'Jupiter',
    type: 'planet',
    orbit: 6,
    difficulty: 'L3',
    brief: 'Gas giant moons, ice and silicate rich, high gravity penalty.',
    minerals: ['ice', 'silicon'],
  },
]

export const PARTS: { chassis: Part[]; propulsion: Part[]; drill: Part[] } = {
  chassis: [
    { id: 'hull-mk1', name: 'Hull MK1', tier: 1, locked: false, img: '/parts/basic_hull_t1.png', mass: 2, cargo: 6 },
    { id: 'hull-mk2', name: 'Hull MK2', tier: 2, locked: false, img: '/parts/reinforced_hull_t2.png', mass: 3, cargo: 10, missionsRequired: 1 },
    { id: 'hull-cargo', name: 'Cargo Bay T1', tier: 1, locked: false, img: '/parts/cargo_bay_t1.png', mass: 2, cargo: 14, missionsRequired: 1 },
    { id: 'hull-mk3', name: 'Hull MK3 – Heavy Frame', tier: 3, locked: true, img: '/parts/reinforced_hull_t2.png', mass: 4, cargo: 18, missionsRequired: 2 },
    { id: 'hull-hauler', name: 'Bulk Hauler Chassis', tier: 3, locked: true, img: '/parts/cargo_bay_t1.png', mass: 3, cargo: 24, missionsRequired: 2 },
  ],
  propulsion: [
    { id: 'ion-a1', name: 'Ion Drive A1', tier: 1, locked: false, img: '/parts/basic_thruster_t1.png', power: 40, max_orbit: 5 },
    { id: 'fusion-b2', name: 'Fusion Drive B2', tier: 2, locked: false, img: '/parts/fusion_drive_t2.png', power: 80, max_orbit: 7, missionsRequired: 1 },
    { id: 'ion-a3', name: 'Ion Drive A3', tier: 3, locked: true, img: '/parts/ion_drive_t3.png', power: 120, max_orbit: 9, missionsRequired: 2 },
  ],
  drill: [
    { id: 'hand-drill', name: 'Hand Drill', tier: 1, locked: false, img: '/parts/mining_drill_t1.png', rate: 1 },
    { id: 'laser-t2', name: 'Laser T2', tier: 2, locked: false, img: '/parts/laser_drill_t2.png', rate: 2, missionsRequired: 1 },
    { id: 'plasma-t3', name: 'Plasma T3', tier: 3, locked: true, img: '/parts/broadcast_array_t2.png', rate: 4, missionsRequired: 2 },
  ],
}

export const MINERAL_META: Record<string, MineralMeta> = {
  iron:    { name: 'Iron',    sym: 'Fe', color: '#d97150', price: 120,   rarity: 'common',   constructionUse: 'Structural frames, smelting feedstock', laserAccess: 1 },
  silicon: { name: 'Silicon', sym: 'Si', color: '#b9d8ff', price: 180,   rarity: 'common',   constructionUse: 'Electronics, solar panels',                 laserAccess: 1 },
  ice:     { name: 'Ice',     sym: 'H2O', color: '#9becff', price: 90,   rarity: 'uncommon', constructionUse: 'Propellant, life support',              laserAccess: 1 },
  carbon:  { name: 'Carbon',  sym: 'C',  color: '#6a7280', price: 60,   rarity: 'common',   constructionUse: 'Composites, fuel',                       laserAccess: 1 },
  gold:    { name: 'Gold',    sym: 'Au', color: '#ffd166', price: 800,   rarity: 'rare',     constructionUse: 'Circuitry, radiation shielding',            laserAccess: 2 },
  rare:    { name: 'Xenon',   sym: 'Xe', color: '#c084ff', price: 2000,  rarity: 'exotic',   constructionUse: 'Quantum sensors, ion propellant',           laserAccess: 3 },
  nickel:  { name: 'Nickel',  sym: 'Ni', color: '#b0b8c4', price: 150,   rarity: 'uncommon', constructionUse: 'Alloys, battery production',              laserAccess: 1 },
  cobalt:  { name: 'Cobalt',  sym: 'Co', color: '#4f9cf7', price: 450,   rarity: 'uncommon', constructionUse: 'Battery cathodes, superalloys',          laserAccess: 2 },
}

export const STARS: Star[] = [
  { id: 'sol',     name: 'Sol',       x: 48, y: 55, kind: 'sol',  dist: '0 ly' },
  { id: 'proxima', name: 'Proxima',   x: 22, y: 30, kind: 'red',  dist: '4.2 ly' },
  { id: 'alpha',   name: 'Alpha Cen', x: 28, y: 42, kind: 'warm', dist: '4.4 ly' },
  { id: 'barnard', name: 'Barnard\'s', x: 38, y: 22, kind: 'red',  dist: '5.9 ly' },
  { id: 'sirius',  name: 'Sirius',    x: 62, y: 20, kind: 'pale', dist: '8.6 ly' },
  { id: 'tau',     name: 'Tau Ceti',  x: 72, y: 38, kind: 'cool', dist: '11.9 ly' },
  { id: 'epsilon', name: 'Eps Eri',   x: 80, y: 62, kind: 'warm', dist: '10.5 ly' },
  { id: 'vega',    name: 'Vega',      x: 58, y: 76, kind: 'pale', dist: '25.0 ly' },
]

export const STAR_LINKS: [string, string][] = [
  ['sol', 'proxima'], ['sol', 'alpha'], ['sol', 'barnard'],
  ['proxima', 'alpha'], ['alpha', 'barnard'], ['barnard', 'sirius'],
  ['sol', 'tau'], ['tau', 'epsilon'], ['epsilon', 'vega'], ['sol', 'vega'],
]

export const M1_STEPS: TutorialStep[] = [
  { id: 0, screen: 'build',   title: 'Build a Launchpad',
    body: 'Every base starts here. Select the Launchpad, then tap a plot to place it on your land.',
    action: 'Tap SELECT A PLOT, then a pad',
    anchor: 'bottom', spot: null, cta: 'Build Launchpad' },
  { id: 1, screen: 'hub',     title: 'Open a Mission',
    body: 'Open the radial menu, then choose MISSIONS to see the contract board.',
    action: 'Tap menu, then MISSIONS',
    anchor: 'bottom', spot: { x: 169, y: 786, w: 64, h: 64 }, cta: 'the menu' },
  { id: 2, screen: 'missions', title: 'Lock a Contract',
    body: 'Pick a mining company. They name the minerals they want and pay a bonus on delivery.',
    action: 'Tap a contract card',
    anchor: 'bottom', spot: { x: 14, y: 154, w: 374, h: 168 }, cta: 'a contract' },
  { id: 3, screen: 'targets',  title: 'Choose a Destination',
    body: 'Tap a highlighted body on the map — only compatible targets are selectable.',
    action: 'Tap a target, then Continue',
    anchor: 'bottom', spot: { x: 36, y: 204, w: 330, h: 482 }, cta: 'a target' },
  { id: 4, screen: 'fab',      title: 'Assemble the Rocket',
    body: 'Your Starter Rocket is pre-loaded with compatible parts. Swap any slot to experiment, or keep the suggested build.',
    manual: true,
    anchor: 'top', spot: { x: 14, y: 154, w: 374, h: 250 }, cta: 'Got it' },
  { id: 5, screen: 'fab',      title: 'Launch',
    body: 'Everything checks out.',
    action: 'Tap CONFIRM LAUNCH',
    anchor: 'top', spot: { x: 14, y: 786, w: 374, h: 64 }, cta: 'Confirm Launch' },
  { id: 6, screen: 'mining',   title: 'Mine the Asteroid',
    body: 'Tap the glowing ore deposits to collect minerals. Fill your contract order, then tap RETURN when you\'re ready to fly home.',
    action: 'Tap ore to mine · then Return',
    anchor: 'center', spot: null, cta: 'mine' },
  { id: 9, screen: 'debrief',  title: 'Debrief',
    body: 'Sell your cargo and collect the contractor bonus.',
    action: 'Tap to collect your reward',
    anchor: 'top', spot: { x: 14, y: 786, w: 374, h: 64 }, cta: 'Collect' },
]

export const M2_STEPS: TutorialStep[] = [
  { id: 20, screen: 'hub', title: 'Starter Rocket 2 Ready',
    body: 'Mission 2 needs 8 silicon — more than your MK1 hull can carry. Hull MK2 is now unlocked in the Fabricator. Open Missions when ready.',
    manual: true,
    anchor: 'bottom', spot: null, cta: 'Got it' },
  { id: 21, screen: 'fab', title: 'Upgrade Your Hull',
    body: 'Swap your Chassis slot to Hull MK2. It holds 10 units — enough to fill the silicon order in one run.',
    manual: true,
    anchor: 'top', spot: { x: 14, y: 154, w: 374, h: 200 }, cta: 'Got it' },
]

export const PROGRESSION_STEPS: TutorialStep[] = [
  ...M1_STEPS,
  ...M2_STEPS,
]

export interface RocketConfig {
  chassis: string
  propulsion: string
  drill: string
}

export function suggestBuild(opts: {
  mission: Mission | null
  target: Target | null
  missionsDone: number
  launchpadUpgraded?: boolean
  parts?: typeof PARTS
}): RocketConfig {
  const { mission, target, parts = PARTS } = opts
  const orbit = target?.orbit ?? 4
  const drillTier = mission?.requires.drill_tier ?? 1
  const cargoMin = mission?.requires.cargo_min ?? 6
  const effectiveMissionsDone = opts.launchpadUpgraded ? Math.max(opts.missionsDone, 1) : opts.missionsDone

  const available = (p: Part) => {
    if (p.locked) return false
    if (p.missionsRequired && effectiveMissionsDone < p.missionsRequired) return false
    return true
  }
  const bestAvail = <T extends Part>(arr: T[]) => [...arr].reverse().find(p => available(p)) ?? arr[0]
  const prop = parts.propulsion.find(p => available(p) && (p.max_orbit ?? 0) >= orbit)
    ?? bestAvail(parts.propulsion)
  const drill = parts.drill.find(p => available(p) && (p.tier ?? 0) >= drillTier)
    ?? bestAvail(parts.drill)
  const chassis = parts.chassis.find(p => available(p) && (p.cargo ?? 0) >= cargoMin)
    ?? bestAvail(parts.chassis)

  return { chassis: chassis.id, propulsion: prop.id, drill: drill.id }
}

export function compatibleTargetsFor(mission: Mission, targets: Target[] = TARGETS): Target[] {
  const required = Object.keys(mission.requires.minerals)
  const isM1 = mission.id === 'm1-iron' || mission.sequence === 1

  return targets.filter(t => {
    const basicCompat = t.orbit <= mission.requires.max_orbit &&
                        required.every(mineral => t.minerals.includes(mineral))
    if (isM1) return basicCompat && t.type === 'asteroid'
    return basicCompat
  })
}

export interface BuildCheck {
  chassis: Part
  propulsion: Part
  drill: Part
  ok: boolean
  problems: string[]
}

export function validateBuild(opts: {
  mission: Mission
  target: Target
  rocket: RocketConfig
  parts?: typeof PARTS
}): BuildCheck {
  const { mission, target, rocket, parts = PARTS } = opts
  const chassis = parts.chassis.find(p => p.id === rocket.chassis) ?? parts.chassis[0]
  const propulsion = parts.propulsion.find(p => p.id === rocket.propulsion) ?? parts.propulsion[0]
  const drill = parts.drill.find(p => p.id === rocket.drill) ?? parts.drill[0]

  const problems: string[] = []
  if ((propulsion.max_orbit ?? 0) < target.orbit) {
    problems.push(`Propulsion can only reach Orbit ${propulsion.max_orbit}, target is Orbit ${target.orbit}`)
  }
  if ((chassis.cargo ?? 0) < mission.requires.cargo_min) {
    problems.push(`Chassis cargo (${chassis.cargo}U) below mission minimum (${mission.requires.cargo_min}U)`)
  }
  if ((drill.tier ?? 0) < mission.requires.drill_tier) {
    problems.push(`Drill T${drill.tier} below mission requirement T${mission.requires.drill_tier}`)
  }

  return { chassis, propulsion, drill, ok: problems.length === 0, problems }
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

export const MINERAL_COLORS: Record<string, string> = {
  iron: '#d97150',
  silicon: '#b9d8ff',
  ice: '#9becff',
  carbon: '#6a7280',
  gold: '#ffd166',
  rare: '#c084ff',
  nickel: '#b0b8c4',
  cobalt: '#4f9cf7',
}
