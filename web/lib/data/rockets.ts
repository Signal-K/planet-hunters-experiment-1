// Landnam game data — the rocket models a player can buy.
//
// Players purchase a rocket per mission. Explorer is always free; Prospector
// and above cost Francs and require mission history.
//
// Naming: "starter rocket" and the SR1/SR2/SR3 scheme are retired vocabulary
// (renamed 2026-07-08, vocabulary retired outright 2026-07-29). The `sr*` ids
// below survive only because they are persisted in saves — `rocket.chassis`,
// `shipCustomizerParts` keys and `SHIP_INTERIOR_LAYOUTS` all key off them, so
// changing them needs a save migration. They are storage keys, not names, and
// must never reach the player.

import type { RocketConfig, RocketModel } from './types'
import { ROCKET_PRICES } from './economy'

export const ROCKET_MODELS: RocketModel[] = [
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
    costFrancs: ROCKET_PRICES.sr2,
    missionsRequired: 1,
    locked: false,
    stats: { cargo: 10, maxOrbit: 7, drillTier: 2 },
    img: '/game/assets/ships/ship_sr2.png',
    unlockHint: 'Unlocks after M1',
  },
  {
    // Coming-soon tease, not yet purchasable — decided cost/unlock condition
    // (rocket-and-room-system.md, 2026-06-18) is ROCKET_PRICES.sr3 at L3/M3, but stats
    // aren't finalized so this stays locked like the two below until they are.
    //
    // "Unannounced" is a status, not a model name. Explorer and Prospector were
    // named 2026-07-08; tiers 3-5 never were, and they render in the Hangar, so
    // a placeholder that reads as a name would leak retired vocabulary to the
    // player. Replace with real names when they're chosen.
    id: 'sr3',
    name: 'Unannounced',
    tier: 3,
    costFrancs: ROCKET_PRICES.sr3,
    missionsRequired: 999,
    locked: true,
    stats: { cargo: 0, maxOrbit: 0, drillTier: 0 },
    img: '/parts/basic_hull_t1.png',
    unlockHint: 'Unlocks at L3/M3',
  },
  {
    id: 'sr4',
    name: 'Unannounced',
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
    name: 'Unannounced',
    tier: 5,
    costFrancs: 0,
    missionsRequired: 999,
    locked: true,
    stats: { cargo: 0, maxOrbit: 0, drillTier: 0 },
    img: '/parts/basic_hull_t1.png',
    unlockHint: 'Coming soon',
  },
]

const ROCKET_MODEL_BY_CHASSIS: Record<string, string> = {
  'hull-mk1': 'sr1',
  'hull-mk2': 'sr2',
  'hull-mk3': 'sr2',
}

export function rocketModelForConfig(rocket: Pick<RocketConfig, 'chassis'> | null | undefined): RocketModel {
  const id = rocket ? ROCKET_MODEL_BY_CHASSIS[rocket.chassis] : undefined
  return ROCKET_MODELS.find(starter => starter.id === id) ?? ROCKET_MODELS[0]
}

export function rocketDisplayForConfig(rocket: Pick<RocketConfig, 'chassis'> | null | undefined): {
  name: string
  img: string
} {
  const starter = rocketModelForConfig(rocket)
  return { name: starter.name, img: starter.img }
}
