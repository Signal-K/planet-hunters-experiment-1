// Landnam game data — targets and stars

import type { Target, Star, Mission } from './types'

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
  const required = Object.keys(mission.requires.minerals)
  const isM1 = mission.id === 'm1-iron' || mission.sequence === 1

  return targets.filter(t => {
    const basicCompat = t.orbit <= mission.requires.max_orbit &&
                        required.every(mineral => t.minerals.includes(mineral))
    if (isM1) return basicCompat && t.type === 'asteroid'
    return basicCompat
  })
}
