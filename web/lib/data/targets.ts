// Landnam game data — targets and stars

import type { Target, Star, Mission, Part, RocketConfig } from './types'
import { mineralsForArchetype } from './target-archetypes'
import { ONBOARDING_SEQUENCE_COUNT } from './mission-generator'
import { suggestBuild, validateBuild } from './parts'

// A landmark target: real body, hand-authored id/name/brief for narrative
// recognizability, minerals derived from its composition archetype + orbit
// (see target-archetypes.ts) rather than hand-picked, so every new template
// or mineral tier is automatically satisfiable everywhere it's plausible —
// no more per-target patching chasing whichever mineral a mission happens
// to need this week.
function landmark(t: Omit<Target, 'minerals'> & { archetype: NonNullable<Target['archetype']> }): Target {
  return { ...t, minerals: mineralsForArchetype(t.archetype, t.orbit) }
}

export const TARGETS: Target[] = [
  // ── Inner solar system planets ─────────────────────────────────────────────
  landmark({
    id: 'mercury',
    name: 'Mercury',
    type: 'planet',
    orbit: 1,
    difficulty: 'L2',
    brief: 'Scorched inner planet, rich in iron and trace silicates.',
    archetype: 'S',
  }),
  landmark({
    id: 'mars',
    name: 'Mars',
    type: 'planet',
    orbit: 4,
    difficulty: 'L1',
    brief: 'Iron-rich rusty plains, well-mapped, starter-friendly.',
    archetype: 'S',
    recommended: true,
  }),
  // ── Near-Earth and inner belt asteroids (orbit 1–4) ────────────────────────
  landmark({
    id: 'eros',
    name: '433 Eros',
    type: 'asteroid',
    orbit: 2,
    difficulty: 'L1',
    brief: 'Elongated near-Earth rock with dense iron-nickel core. First commercial prospect on file.',
    archetype: 'S',
    recommended: true,
  }),
  landmark({
    id: 'vesta',
    name: '4 Vesta',
    type: 'asteroid',
    orbit: 3,
    difficulty: 'L1',
    brief: 'Differentiated protoplanet. Basaltic crust over a heavy iron mantle.',
    archetype: 'S',
  }),
  landmark({
    id: 'itokawa',
    name: '25143 Itokawa',
    type: 'asteroid',
    orbit: 2,
    difficulty: 'L1',
    brief: 'Stony near-Earth rubble pile with accessible nickel-iron traces.',
    archetype: 'S',
  }),
  landmark({
    id: 'ryugu',
    name: '162173 Ryugu',
    type: 'asteroid',
    orbit: 3,
    difficulty: 'L1',
    brief: 'Carbonaceous near-Earth asteroid with hydrated minerals and dark regolith.',
    archetype: 'C',
  }),
  landmark({
    id: 'psyche',
    name: '16 Psyche',
    type: 'asteroid',
    orbit: 4,
    difficulty: 'L2',
    brief: 'Exposed metallic core of an ancient body. Extremely high iron and nickel grades — the richest known prospecting site on file.',
    archetype: 'M',
  }),
  landmark({
    id: 'bennu',
    name: '101955 Bennu',
    type: 'asteroid',
    orbit: 2,
    difficulty: 'L1',
    brief: 'Carbon-rich near-Earth asteroid. Loose rubble pile, low gravity, easy approach.',
    archetype: 'C',
  }),
  // ── Main belt / outer (orbit 5+) ───────────────────────────────────────────
  // 'The belt' is a region, not a destination — every belt body is its own
  // real, individually pickable target (see BELT_BODY_IDS in PixiGalaxyMap),
  // not a single catch-all zone entry.
  landmark({
    id: 'ceres',
    name: '1 Ceres',
    type: 'asteroid',
    orbit: 5,
    difficulty: 'L2',
    brief: 'Dwarf planet at the belt\'s inner edge. Ice-rich mantle beneath a carbon-dark crust.',
    archetype: 'C',
  }),
  landmark({
    id: 'lutetia',
    name: '21 Lutetia',
    type: 'asteroid',
    orbit: 6,
    difficulty: 'L2',
    brief: 'A large carbonaceous asteroid in the outer belt. Hydrated minerals under a dark regolith crust.',
    archetype: 'C',
    recommended: false,
  }),
  // ── Outer planets ──────────────────────────────────────────────────────────
  landmark({
    id: 'jupiter',
    name: 'Jupiter',
    type: 'planet',
    orbit: 6,
    difficulty: 'L3',
    brief: 'Gas giant with hydrogen, helium, and a high gravity penalty. Jupiter itself is not a conventional mining site.',
    archetype: 'gas-giant',
  }),
]

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

export function compatibleTargetsFor(mission: Mission, targets: Target[] = TARGETS): Target[] {
  // Explicit fixed-target missions: only the designated target is valid.
  if (mission.targetId) return targets.filter(t => t.id === mission.targetId)

  const required = Object.keys(mission.requires.minerals)
  // Onboarding (M1/M2) stays scoped to asteroids — planets unlock as
  // targets from M3 onward. Unlike the old isOnboarding bypass this never
  // skips the mineral check; it only narrows which *type* of body onboarding
  // is allowed to offer, honestly, alongside the same requirement everyone
  // else has to satisfy.
  const isOnboarding = mission.sequence <= ONBOARDING_SEQUENCE_COUNT

  return targets.filter(t => {
    const inRange = t.orbit <= mission.requires.max_orbit
    const typeOk = !isOnboarding || t.type === 'asteroid'
    return inRange && typeOk && required.every(mineral => t.minerals.includes(mineral))
  })
}

/** Contract-compatible targets that the player's currently unlocked parts can
 * actually reach, carry, and mine. Keep this beside compatibleTargetsFor so
 * the board and target picker cannot disagree about mission feasibility. */
export function feasibleTargetsFor(
  mission: Mission,
  targets: Target[],
  parts: { chassis: Part[]; propulsion: Part[]; drill: Part[] },
  missionsDone: number,
  launchpadUpgraded = false,
  unlockedSkillNodes: string[] = [],
): Target[] {
  const deliveryTarget = mission.deliveryTargetId
    ? targets.find(target => target.id === mission.deliveryTargetId) ?? null
    : null

  return compatibleTargetsFor(mission, targets).filter(target => {
    const rocket: RocketConfig = suggestBuild({
      mission,
      target,
      deliveryTarget,
      missionsDone,
      launchpadUpgraded,
      parts,
      unlockedSkillNodes,
    })
    return validateBuild({ mission, target, rocket, parts, unlockedSkillNodes }).ok
  })
}
