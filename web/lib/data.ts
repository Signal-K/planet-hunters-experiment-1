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
    xp: number
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
}

export interface MineralMeta {
  name: string
  sym: string
  color: string
  price: number
}

export interface Contractor {
  id: string
  name: string
  color: string
  initial: string
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

export const CONTRACTORS: Record<string, Contractor> = {
  foundry3: { id: 'foundry3', name: 'Foundry-3 Corp', color: '#d97150', initial: 'F3' },
  cryos: { id: 'cryos', name: 'Cryos Mining', color: '#9becff', initial: 'CM' },
  beltgold: { id: 'beltgold', name: 'Belt Gold Ltd', color: '#ffd166', initial: 'BG' },
}

export const MISSIONS: Mission[] = [
  {
    id: 'm1-iron',
    title: 'Iron for Foundry-3',
    brief: 'Foundry-3 needs a fresh iron shipment to keep their smelters running. Belt region preferred.',
    contractor: 'foundry3',
    tag: 'STARTER',
    difficulty: 'L1',
    locked: false,
    sequence: 1,
    requires: { minerals: { iron: 6 }, cargo_min: 6, drill_tier: 1, max_orbit: 4 },
    payout: { francs: 1200000, xp: 120, affinity: 10 },
  },
  {
    id: 'm2-silicon',
    title: 'Silicon Mass Order',
    brief: 'Cryos needs raw silicon for their electronics division. Any asteroid source accepted.',
    contractor: 'cryos',
    tag: 'BULK',
    difficulty: 'L2',
    locked: false,
    sequence: 2,
    requires: { minerals: { silicon: 8 }, cargo_min: 8, drill_tier: 1, max_orbit: 5 },
    payout: { francs: 1800000, xp: 180, affinity: 8 },
  },
  {
    id: 'm3-gold',
    title: 'Belt Gold Prospect',
    brief: 'Belt Gold Ltd runs a premium grade — they want gold ore from the outer belt.',
    contractor: 'beltgold',
    tag: 'PROSPECT',
    difficulty: 'L3',
    locked: true,
    sequence: 3,
    requiresClassification: true,
    unlockAt: 'Complete M2',
    requires: { minerals: { gold: 4 }, cargo_min: 4, drill_tier: 2, max_orbit: 6 },
    payout: { francs: 4500000, xp: 450, affinity: 15 },
  },
  {
    id: 'm4-rare',
    title: 'Signal in the Dark',
    brief: 'A confirmed transit candidate needs a surface assay. Choose any reachable body and bring back rare material.',
    contractor: 'cryos',
    tag: 'COMMAND',
    difficulty: 'L3',
    locked: true,
    sequence: 4,
    unlockAt: 'Complete M3',
    requires: { minerals: { rare: 4 }, cargo_min: 4, drill_tier: 2, max_orbit: 6 },
    payout: { francs: 6200000, xp: 620, affinity: 20 },
  },
]

export const TARGETS: Target[] = [
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
  {
    id: 'belt',
    name: 'Asteroid Belt',
    type: 'asteroid',
    orbit: 5,
    difficulty: 'L2',
    brief: 'Varied deposits — iron, silicon, gold, rare. The prospector\'s playground.',
    minerals: ['iron', 'silicon', 'gold', 'rare'],
    recommended: true,
  },
  {
    id: 'jupiter',
    name: 'Jupiter',
    type: 'planet',
    orbit: 6,
    difficulty: 'L3',
    brief: 'Gas giant moons, ice and silicate rich, high gravity penalty.',
    minerals: ['ice', 'silicon'],
  },
  {
    id: 'tess-451b',
    name: 'TESS-451 b',
    type: 'asteroid',
    orbit: 5,
    difficulty: 'L3',
    brief: 'Transit candidate selected by the science team. Spectral returns indicate gold and rare compounds.',
    minerals: ['gold', 'rare'],
    recommended: true,
  },
]

export const PARTS: { chassis: Part[]; propulsion: Part[]; drill: Part[] } = {
  chassis: [
    { id: 'hull-mk1', name: 'Hull MK1', tier: 1, locked: false, img: '/parts/basic_hull_t1.png', mass: 2, cargo: 6 },
    { id: 'hull-mk2', name: 'Hull MK2', tier: 2, locked: false, img: '/parts/reinforced_hull_t2.png', mass: 3, cargo: 10 },
    { id: 'hull-cargo', name: 'Cargo Bay T1', tier: 1, locked: false, img: '/parts/cargo_bay_t1.png', mass: 2, cargo: 14 },
  ],
  propulsion: [
    { id: 'ion-a1', name: 'Ion Drive A1', tier: 1, locked: false, img: '/parts/basic_thruster_t1.png', power: 40, max_orbit: 5 },
    { id: 'fusion-b2', name: 'Fusion Drive B2', tier: 2, locked: false, img: '/parts/fusion_drive_t2.png', power: 80, max_orbit: 7 },
    { id: 'ion-a3', name: 'Ion Drive A3', tier: 3, locked: true, img: '/parts/ion_drive_t3.png', power: 120, max_orbit: 9 },
  ],
  drill: [
    { id: 'hand-drill', name: 'Hand Drill', tier: 1, locked: false, img: '/parts/mining_drill_t1.png', rate: 1 },
    { id: 'laser-t2', name: 'Laser T2', tier: 2, locked: false, img: '/parts/mining_drill_t1.png', rate: 2 },
    { id: 'plasma-t3', name: 'Plasma T3', tier: 3, locked: true, img: '/parts/mining_drill_t1.png', rate: 4 },
  ],
}

export const MINERAL_META: Record<string, MineralMeta> = {
  iron:    { name: 'Iron',    sym: 'Fe', color: '#d97150', price: 120 },
  silicon: { name: 'Silicon', sym: 'Si', color: '#b9d8ff', price: 180 },
  ice:     { name: 'Ice',     sym: 'H2O', color: '#9becff', price: 90 },
  carbon:  { name: 'Carbon',  sym: 'C',  color: '#6a7280', price: 60 },
  gold:    { name: 'Gold',    sym: 'Au', color: '#ffd166', price: 800 },
  rare:    { name: 'Rare',    sym: 'Xe', color: '#c084ff', price: 2000 },
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
    anchor: 'top', spot: { x: 302, y: 506, w: 84, h: 64 }, cta: 'the menu' },
  { id: 2, screen: 'missions', title: 'Lock a Contract',
    body: 'Pick a mining company. They name the minerals they want and pay a bonus on delivery.',
    action: 'Tap a contract card',
    anchor: 'bottom', spot: { x: 14, y: 154, w: 374, h: 168 }, cta: 'a contract' },
  { id: 3, screen: 'targets',  title: 'Choose a Destination',
    body: 'Tap a highlighted body on the map — only compatible targets are selectable.',
    action: 'Tap a target, then Continue',
    anchor: 'bottom', spot: { x: 20, y: 80, w: 362, h: 360 }, cta: 'a target' },
  { id: 4, screen: 'fab',      title: 'Assemble the Rocket',
    body: 'Your Starter Rocket is pre-loaded with compatible parts. Swap any slot to experiment, or keep the suggested build.',
    manual: true,
    anchor: 'top', spot: { x: 14, y: 154, w: 374, h: 250 }, cta: 'Got it' },
  { id: 5, screen: 'fab',      title: 'Launch',
    body: 'Everything checks out.',
    action: 'Tap CONFIRM LAUNCH',
    anchor: 'top', spot: { x: 14, y: 786, w: 374, h: 64 }, cta: 'Confirm Launch' },
  { id: 6, screen: 'mining',   title: 'Mine the Asteroid',
    body: 'Tap the glowing ore deposits to fire your laser. Fill your contract order, then tap RETURN when you\'re ready to fly home.',
    action: 'Tap ore to mine · then Return',
    anchor: 'center', spot: null, cta: 'mine' },
  { id: 9, screen: 'debrief',  title: 'Debrief',
    body: 'Sell your cargo and collect the contractor bonus.',
    action: 'Tap to collect your reward',
    anchor: 'top', spot: { x: 14, y: 786, w: 374, h: 64 }, cta: 'Collect' },
]

export const PROGRESSION_STEPS: TutorialStep[] = [
  ...M1_STEPS,
  { id: 30, screen: 'classify', title: 'Classify a TESS Lightcurve',
    body: 'The repeating dip may be a planet crossing its star. Inspect the signal, then record PLANET or NOT PLANET for the science team.',
    action: 'Inspect the dip and submit a classification',
    anchor: 'bottom', spot: { x: 14, y: 190, w: 374, h: 300 }, cta: 'Classify' },
  { id: 40, screen: 'missions', title: 'You\'re in Command Now',
    body: 'The final authored contract is yours to run. Pick any reachable destination and bring the crew home.',
    manual: true, anchor: 'top', spot: null, cta: 'Take Command' },
]

export interface RocketConfig {
  chassis: string
  propulsion: string
  drill: string
}

export function suggestBuild(opts: {
  mission: Mission | null
  target: Target | null
  level: number
}): RocketConfig {
  const { mission, target } = opts
  const orbit = target?.orbit ?? 4
  const drillTier = mission?.requires.drill_tier ?? 1
  const cargoMin = mission?.requires.cargo_min ?? 6

  // pick propulsion that reaches the target
  const prop = PARTS.propulsion.find(p => !p.locked && (p.max_orbit ?? 0) >= orbit)
    ?? PARTS.propulsion[0]

  // pick drill that meets tier
  const drill = PARTS.drill.find(p => !p.locked && (p.tier ?? 0) >= drillTier)
    ?? PARTS.drill[0]

  // pick chassis with enough cargo
  const chassis = PARTS.chassis.find(p => !p.locked && (p.cargo ?? 0) >= cargoMin)
    ?? PARTS.chassis[0]

  return { chassis: chassis.id, propulsion: prop.id, drill: drill.id }
}

export function compatibleTargetsFor(mission: Mission): Target[] {
  const required = Object.keys(mission.requires.minerals)
  const isM1 = mission.id === 'm1-iron' || mission.sequence === 1;
  
  return TARGETS.filter(t => {
    // Basic orbit and mineral compatibility
    const basicCompat = t.orbit <= mission.requires.max_orbit && 
                        required.every(mineral => t.minerals.includes(mineral));
    
    // M1 restriction: only asteroids
    if (isM1) {
      return basicCompat && t.type === 'asteroid';
    }
    
    return basicCompat;
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
}): BuildCheck {
  const { mission, target, rocket } = opts
  const chassis = PARTS.chassis.find(p => p.id === rocket.chassis) ?? PARTS.chassis[0]
  const propulsion = PARTS.propulsion.find(p => p.id === rocket.propulsion) ?? PARTS.propulsion[0]
  const drill = PARTS.drill.find(p => p.id === rocket.drill) ?? PARTS.drill[0]

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

export function sellCargo(cargo: Record<string, number>): number {
  return Object.entries(cargo).reduce((sum, [k, v]) => {
    const meta = MINERAL_META[k]
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
}
