// Landnam game data — prebuilt starter rockets (SR1–SR5)
// Players purchase a rocket per mission. SR1 is always free. SR2+ require Francs + mission history.

import type { StarterRocket } from './types'

export const STARTER_ROCKETS: StarterRocket[] = [
  {
    id: 'sr1',
    name: 'Starter Rocket 1',
    tier: 1,
    costFrancs: 0,
    missionsRequired: 0,
    locked: false,
    stats: { cargo: 6, maxOrbit: 5, drillTier: 1 },
    img: '/parts/starter_rocket_t1.png',
    unlockHint: 'Available from the start',
  },
  {
    id: 'sr2',
    name: 'Starter Rocket 2',
    tier: 2,
    costFrancs: 1_300_000_000,
    missionsRequired: 1,
    locked: false,
    stats: { cargo: 10, maxOrbit: 7, drillTier: 2 },
    img: '/parts/reinforced_hull_t2.png',
    unlockHint: 'Unlocks after M1',
  },
  {
    id: 'sr3',
    name: 'Starter Rocket 3',
    tier: 3,
    costFrancs: 4_000_000_000,
    missionsRequired: 3,
    locked: true,
    stats: { cargo: 18, maxOrbit: 9, drillTier: 3 },
    img: '/parts/reinforced_hull_t2.png',
    unlockHint: 'Unlocks after M3',
  },
  {
    id: 'sr4',
    name: 'Starter Rocket 4',
    tier: 4,
    costFrancs: 0,
    missionsRequired: 999,
    locked: true,
    stats: { cargo: 0, maxOrbit: 0, drillTier: 0 },
    img: '/parts/basic_hull_t1.png',
    unlockHint: 'Coming soon',
  },
  {
    id: 'sr5',
    name: 'Starter Rocket 5',
    tier: 5,
    costFrancs: 0,
    missionsRequired: 999,
    locked: true,
    stats: { cargo: 0, maxOrbit: 0, drillTier: 0 },
    img: '/parts/basic_hull_t1.png',
    unlockHint: 'Coming soon',
  },
]
