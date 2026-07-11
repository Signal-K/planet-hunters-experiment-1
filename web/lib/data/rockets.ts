// Landnam game data — prebuilt starter rockets
// Players purchase a rocket per mission. Explorer (SR1) is always free. Prospector (SR2)+ require Francs + mission history.

import type { RocketConfig, StarterRocket } from './types'

export const STARTER_ROCKETS: StarterRocket[] = [
  {
    id: 'sr1',
    name: 'Explorer',
    tier: 1,
    costFrancs: 0,
    missionsRequired: 0,
    locked: false,
    stats: { cargo: 6, maxOrbit: 5, drillTier: 1 },
    img: '/game/assets/ships/ship_sr1.png',
    unlockHint: 'Available from the start',
  },
  {
    id: 'sr2',
    name: 'Prospector',
    tier: 2,
    costFrancs: 1_300_000_000,
    missionsRequired: 1,
    locked: false,
    stats: { cargo: 10, maxOrbit: 7, drillTier: 2 },
    img: '/game/assets/ships/ship_sr2.png',
    unlockHint: 'Unlocks after M1',
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

const STARTER_ROCKET_BY_CHASSIS: Record<string, string> = {
  'hull-mk1': 'sr1',
  'hull-mk2': 'sr2',
  'hull-mk3': 'sr2',
}

export function starterRocketForConfig(rocket: Pick<RocketConfig, 'chassis'> | null | undefined): StarterRocket {
  const id = rocket ? STARTER_ROCKET_BY_CHASSIS[rocket.chassis] : undefined
  return STARTER_ROCKETS.find(starter => starter.id === id) ?? STARTER_ROCKETS[0]
}

export function rocketDisplayForConfig(rocket: Pick<RocketConfig, 'chassis'> | null | undefined): {
  name: string
  img: string
} {
  const starter = starterRocketForConfig(rocket)
  return { name: starter.name, img: starter.img }
}
