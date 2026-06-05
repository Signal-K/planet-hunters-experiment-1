/* global window */
// Landnam — data + validation helpers
// All shared via window.LandnamData so other JSX files can read it.

// ─── Minerals ────────────────────────────────────────────────────────
const MINERAL_META = {
  silicon: { name: 'Silicon', sym: 'Si',  color: '#b9d8ff', price: 8 },
  iron:    { name: 'Iron',    sym: 'Fe',  color: '#d97150', price: 12 },
  ice:     { name: 'Ice',     sym: 'H₂O', color: '#9becff', price: 14 },
  carbon:  { name: 'Carbon',  sym: 'C',   color: '#6a7280', price: 6 },
  gold:    { name: 'Gold',    sym: 'Au',  color: '#ffd166', price: 90 },
  rare:    { name: 'Rare',    sym: '??',  color: '#c084ff', price: 220 },
};

// ─── Stars (galaxy atlas) ────────────────────────────────────────────
const STARS = [
  { id: 'vega',     name: 'VEGA',        dist: '25.1 ly',  x: 22, y: 12, kind: 'cool' },
  { id: 'procyon',  name: 'PROCYON',     dist: '11.46 ly', x: 70, y: 18, kind: 'pale' },
  { id: 'sirius',   name: 'SIRIUS',      dist: '8.60 ly',  x: 80, y: 36, kind: 'cool' },
  { id: 'sol',      name: 'SOL',         dist: '0.00 ly',  x: 50, y: 50, kind: 'sol' },
  { id: 'alpha',    name: 'α CENTAURI',  dist: '4.37 ly',  x: 30, y: 60, kind: 'warm' },
  { id: 'barnard',  name: 'BARNARD',     dist: '5.96 ly',  x: 60, y: 70, kind: 'red' },
  { id: 'altair',   name: 'ALTAIR',      dist: '16.7 ly',  x: 24, y: 84, kind: 'pale' },
  { id: 'wolf',     name: 'WOLF 359',    dist: '7.86 ly',  x: 78, y: 80, kind: 'red' },
];
const STAR_LINKS = [
  ['vega','procyon'], ['procyon','sol'], ['sirius','sol'],
  ['sol','alpha'], ['sol','barnard'], ['alpha','wolf'], ['barnard','altair'],
];

// ─── Targets (Sol system) ────────────────────────────────────────────
// minerals: which ores it yields (probability-weighted, in order)
// orbit:   1-8, drives travel range requirement
// difficulty: extraction difficulty 1-3 (drives min drill tier guidance)
const TARGETS = [
  { id: 'mercury', name: 'Mercury',  orbit: 1, color: '#a89788', minerals: ['silicon','iron'],         difficulty: 1, brief: 'Hot, cratered, silicon-rich crust.' },
  { id: 'venus',   name: 'Venus',    orbit: 2, color: '#e6c074', minerals: ['carbon','silicon'],       difficulty: 2, brief: 'Acid clouds. Carbon plates near the poles.' },
  { id: 'earth',   name: 'Earth',    orbit: 3, color: '#6ba3d8', minerals: [],                          difficulty: 0, brief: 'Home base. No mining permitted.', hub: true },
  { id: 'mars',    name: 'Mars',     orbit: 4, color: '#d97150', minerals: ['iron','silicon'],          difficulty: 1, brief: 'Iron-rich regolith, gentle gravity.', recommended: true },
  { id: 'belt',    name: 'Asteroid Belt', orbit: 5, color: '#c9c1a8', minerals: ['iron','gold','rare'], difficulty: 2, brief: 'Loose rubble. Gold pockets, rare anomalies.' },
  { id: 'jupiter', name: 'Jupiter',  orbit: 6, color: '#d4a06a', minerals: ['ice','rare'],              difficulty: 3, brief: 'Skim the upper bands for compressed ice.', moonOnly: true },
  { id: 'saturn',  name: 'Saturn',   orbit: 7, color: '#e6d4a0', minerals: ['ice','gold'],              difficulty: 3, brief: 'Ring fragments — beautiful and lethal.' },
  { id: 'neptune', name: 'Neptune',  orbit: 8, color: '#5a8dd0', minerals: ['ice'],                     difficulty: 3, brief: 'Frigid methane storms. Pure ice cores.' },
];

// ─── Parts ───────────────────────────────────────────────────────────
const ART = '../../assets/parts/';
const PARTS = {
  chassis: [
    { id: 'hull-mk1',  name: 'HULL-MK1',  tier: 1, mass: 60,  cargo: 60,  img: ART + 'basic_hull_t1.png' },
    { id: 'hull-mk2',  name: 'HULL-MK2',  tier: 2, mass: 90,  cargo: 120, img: ART + 'reinforced_hull_t2.png' },
    { id: 'frame-x12', name: 'FRAME-X12', tier: 2, mass: 110, cargo: 180, img: ART + 'cargo_bay_t1.png' },
    { id: 'vessel-x12',name: 'VESSEL-X12 HEAVY', tier: 3, mass: 140, cargo: 240, locked: true, unlockAt: 'L5', img: ART + 'reinforced_hull_t2.png' },
  ],
  // power → max_orbit reachable (rough heuristic for "range")
  propulsion: [
    { id: 'ion-a1',     name: 'ION-A1',     tier: 1, power: 4,  max_orbit: 3,  img: ART + 'basic_thruster_t1.png' },
    { id: 'hydra-v',    name: 'HYDRA-V',    tier: 2, power: 8,  max_orbit: 5,  img: ART + 'fusion_drive_t2.png' },
    { id: 'vulcan-ix',  name: 'VULCAN-IX',  tier: 3, power: 12, max_orbit: 8,  img: ART + 'ion_drive_t3.png' },
    { id: 'antimatter', name: 'ANTI-MATTER',tier: 4, power: 22, max_orbit: 12, locked: true, unlockAt: 'L7', img: ART + 'ion_drive_t3.png' },
  ],
  // drill tier required for different difficulty deposits
  drill: [
    { id: 'hand-drill',   name: 'HAND-DRILL',   tier: 1, rate: 1, img: ART + 'mining_drill_t1.png' },
    { id: 'pulse-drill',  name: 'PULSE-DRILL',  tier: 2, rate: 2, img: ART + 'mining_drill_t1.png' },
    { id: 'cryo-cutter',  name: 'CRYO-CUTTER',  tier: 2, rate: 2, img: ART + 'mining_drill_t1.png' },
    { id: 'plasma-lance', name: 'PLASMA-LANCE', tier: 3, rate: 3, locked: true, unlockAt: 'L6', img: ART + 'mining_drill_t1.png' },
  ],
};

// ─── Contractors ─────────────────────────────────────────────────────
const CONTRACTORS = {
  helios:  { id: 'helios',  name: 'Helios Mining Co.', color: '#ff8a4a', glyph: 'sun',    affinity: 2 },
  cryos:   { id: 'cryos',   name: 'Cryos Labs',         color: '#9becff', glyph: 'snow',   affinity: 1 },
  guild:   { id: 'guild',   name: 'Foundry Guild',      color: '#ffd166', glyph: 'anvil',  affinity: 3 },
  beacon:  { id: 'beacon',  name: 'Beacon Relay',       color: '#7ec8ff', glyph: 'wave',   affinity: 0 },
  sirius:  { id: 'sirius',  name: 'Sirius Survey',      color: '#c084ff', glyph: 'star',   affinity: 0 },
};

// ─── Missions ────────────────────────────────────────────────────────
// requires:
//   minerals: { id: amount }     — what must be in the cargo on return
//   cargo_min: number            — minimum chassis cargo capacity
//   drill_tier: number           — minimum drill tier
//   max_orbit: number            — target orbit must be <= this (mission scope)
const MISSIONS = [
  {
    id: 'm-iron-foundry',
    contractor: 'helios',
    title: 'Iron for Foundry-3',
    brief: 'Helios needs raw iron to keep the orbital foundry running this cycle. Inner-system run.',
    requires: { minerals: { iron: 20 }, cargo_min: 60, drill_tier: 1, max_orbit: 5 },
    payout: { francs: 480, xp: 120, affinity: 1 },
    difficulty: 'M1',
    tag: 'STARTER',
    hot: true,
  },
  {
    id: 'm-cryos-ice',
    contractor: 'cryos',
    title: 'Cryos Ice Run',
    brief: 'Three barrels of clean ice for the Jovian moonbase. Cold-rated drill recommended.',
    requires: { minerals: { ice: 30 }, cargo_min: 100, drill_tier: 2, max_orbit: 7 },
    payout: { francs: 1200, xp: 320, affinity: 2 },
    difficulty: 'M2',
    tag: 'CONTRACT',
  },
  {
    id: 'm-belt-gold',
    contractor: 'guild',
    title: 'Belt Prospect · Gold',
    brief: 'The Foundry Guild wants a sample of belt-grade gold. Bring back at least 3 units.',
    requires: { minerals: { gold: 3, iron: 10 }, cargo_min: 80, drill_tier: 2, max_orbit: 5 },
    payout: { francs: 2200, xp: 480, affinity: 2 },
    difficulty: 'M2',
    tag: 'PROSPECT',
  },
  {
    id: 'm-silicon-mass',
    contractor: 'helios',
    title: 'Silicon Mass Order',
    brief: 'Large volume order. Bring back 40 units of silicon from anywhere.',
    requires: { minerals: { silicon: 40 }, cargo_min: 80, drill_tier: 1, max_orbit: 5 },
    payout: { francs: 720, xp: 180, affinity: 1 },
    difficulty: 'M1',
    tag: 'BULK',
  },
  {
    id: 'm-rare-anomaly',
    contractor: 'sirius',
    title: 'Rare Anomaly Trace',
    brief: 'Survey detected rare-element anomalies in the belt. Bring back any rare sample.',
    requires: { minerals: { rare: 1 }, cargo_min: 60, drill_tier: 2, max_orbit: 5 },
    payout: { francs: 3200, xp: 720, affinity: 4 },
    difficulty: 'M3',
    tag: 'BOUNTY',
  },
  {
    id: 'm-locked-deepfreeze',
    contractor: 'beacon',
    title: 'Neptune Deep Freeze',
    brief: 'Sample pure-core ice from Neptune. Requires antimatter propulsion.',
    requires: { minerals: { ice: 40 }, cargo_min: 180, drill_tier: 3, max_orbit: 12 },
    payout: { francs: 8400, xp: 1800, affinity: 6 },
    difficulty: 'L7',
    tag: 'LOCKED',
    locked: true,
    unlockAt: 'L7',
  },
];

// ─── Compatibility / validation helpers ──────────────────────────────

// Which targets in TARGETS could satisfy this mission's mineral list?
function compatibleTargetsFor(mission) {
  if (!mission) return [];
  const needed = Object.keys(mission.requires.minerals);
  return TARGETS.filter(t => {
    if (t.hub) return false;
    if (t.orbit > mission.requires.max_orbit) return false;
    // target must yield every mineral the mission asks for
    return needed.every(n => t.minerals.includes(n));
  });
}

// Full constraint check for a built rocket against a mission + target.
// Returns { ok, problems: string[] }
function validateBuild({ mission, target, rocket }) {
  const problems = [];
  const chassis    = PARTS.chassis.find(p => p.id === rocket.chassis);
  const propulsion = PARTS.propulsion.find(p => p.id === rocket.propulsion);
  const drill      = PARTS.drill.find(p => p.id === rocket.drill);

  if (!chassis || !propulsion || !drill) {
    problems.push('All three slots must be filled');
    return { ok: false, problems, chassis, propulsion, drill };
  }
  if (chassis.locked)    problems.push(chassis.name + ' is locked');
  if (propulsion.locked) problems.push(propulsion.name + ' is locked');
  if (drill.locked)      problems.push(drill.name + ' is locked');

  if (mission) {
    const cargoNeeded = Object.values(mission.requires.minerals).reduce((a,b)=>a+b,0);
    const cargoMin = Math.max(mission.requires.cargo_min, cargoNeeded);
    if (chassis.cargo < cargoMin) {
      problems.push(`Cargo too small · need ≥ ${cargoMin} U, have ${chassis.cargo} U`);
    }
    if (drill.tier < mission.requires.drill_tier) {
      problems.push(`Drill too weak · need T${mission.requires.drill_tier}+, have T${drill.tier}`);
    }
  }
  if (target) {
    if (propulsion.max_orbit < target.orbit) {
      problems.push(`Propulsion can't reach ${target.name} · need orbit ≥ ${target.orbit}, ${propulsion.name} only reaches ${propulsion.max_orbit}`);
    }
  }

  return { ok: problems.length === 0, problems, chassis, propulsion, drill };
}

// Cheapest valid auto-build (for "Suggest Build" button)
function suggestBuild({ mission, target, level = 4 }) {
  // find lowest-tier chassis with enough cargo
  const cargoMin = Math.max(
    mission ? mission.requires.cargo_min : 0,
    mission ? Object.values(mission.requires.minerals).reduce((a,b)=>a+b,0) : 0
  );
  const chassis = PARTS.chassis.find(p => !p.locked && p.cargo >= cargoMin) || PARTS.chassis[0];
  const propulsion = PARTS.propulsion.find(p => !p.locked && p.max_orbit >= target.orbit) || PARTS.propulsion[0];
  const drillTierMin = mission ? mission.requires.drill_tier : target.difficulty;
  const drill = PARTS.drill.find(p => !p.locked && p.tier >= drillTierMin) || PARTS.drill[0];
  return { chassis: chassis.id, propulsion: propulsion.id, drill: drill.id };
}

// Compute francs for a returned cargo
function sellCargo(cargo) {
  return Object.entries(cargo).reduce((a, [k, v]) => a + (MINERAL_META[k]?.price || 0) * v, 0);
}

// Rate a mission outcome (1–3 stars)
function rateMission({ mission, cargo, elapsed }) {
  if (!mission) {
    // sandbox mission — rate on cargo fill
    const total = Object.values(cargo).reduce((a,b)=>a+b,0);
    return total > 100 ? 3 : total > 50 ? 2 : 1;
  }
  // Did we hit each mineral requirement?
  const need = mission.requires.minerals;
  let stars = 0;
  const allHit = Object.entries(need).every(([k, v]) => (cargo[k] || 0) >= v);
  if (allHit) stars = 2;
  // Bonus: hit each by 50%+
  const surplus = Object.entries(need).every(([k, v]) => (cargo[k] || 0) >= v * 1.5);
  if (allHit && surplus) stars = 3;
  if (!allHit) stars = 1;
  return stars;
}

window.LandnamData = {
  MINERAL_META, STARS, STAR_LINKS, TARGETS, PARTS, CONTRACTORS, MISSIONS,
  compatibleTargetsFor, validateBuild, suggestBuild, sellCargo, rateMission,
};
