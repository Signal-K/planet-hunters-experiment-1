// Landnam game data — the rocket models a player can buy.
//
// Players purchase a rocket per mission. Explorer is always free; Prospector
// and above cost Francs and require mission history.
//
// Explorer and Prospector are the canonical runtime identifiers. Legacy sr*
// strings are accepted only at compatibility boundaries for old room layouts
// and asset filenames; they are not model ids or player-facing copy.

import type { RocketConfig, RocketModel } from './types'
import { ROCKET_PRICES } from './economy'

export const ROCKET_IDS = {
  explorer: 'explorer',
  prospector: 'prospector',
  unannounced3: 'unannounced-3',
  unannounced4: 'unannounced-4',
  unannounced5: 'unannounced-5',
} as const

export const LEGACY_ROCKET_IDS = {
  sr1: ROCKET_IDS.explorer,
  sr2: ROCKET_IDS.prospector,
  sr3: ROCKET_IDS.unannounced3,
  sr4: ROCKET_IDS.unannounced4,
  sr5: ROCKET_IDS.unannounced5,
} as const

export const ROCKET_MODELS: RocketModel[] = [
  {
    id: ROCKET_IDS.explorer,
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
    id: ROCKET_IDS.prospector,
    name: 'Prospector',
    tier: 2,
    costFrancs: ROCKET_PRICES.prospector,
    missionsRequired: 1,
    locked: false,
    stats: { cargo: 10, maxOrbit: 7, drillTier: 2 },
    img: '/game/assets/ships/ship_sr2.png',
    unlockHint: 'Unlocks after M1',
  },
  {
    // Coming-soon tease, not yet purchasable — decided cost/unlock condition
    // (rocket-and-room-system.md, 2026-06-18) is ROCKET_PRICES.unannounced3 at L3/M3, but stats
    // aren't finalized so this stays locked like the two below until they are.
    //
    // "Unannounced" is a status, not a model name. Explorer and Prospector were
    // named 2026-07-08; tiers 3-5 never were, and they render in the Hangar, so
    // a placeholder that reads as a name would leak retired vocabulary to the
    // player. Replace with real names when they're chosen.
    id: ROCKET_IDS.unannounced3,
    name: 'Unannounced',
    tier: 3,
    costFrancs: ROCKET_PRICES.unannounced3,
    missionsRequired: 999,
    locked: true,
    stats: { cargo: 0, maxOrbit: 0, drillTier: 0 },
    img: '/parts/basic_hull_t1.png',
    unlockHint: 'Unlocks at L3/M3',
  },
  {
    id: ROCKET_IDS.unannounced4,
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
    id: ROCKET_IDS.unannounced5,
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
  'hull-mk1': ROCKET_IDS.explorer,
  'hull-mk2': ROCKET_IDS.prospector,
  'hull-mk3': ROCKET_IDS.prospector,
}

export function rocketModelForConfig(rocket: Pick<RocketConfig, 'chassis'> | null | undefined): RocketModel {
  const id = rocket ? ROCKET_MODEL_BY_CHASSIS[rocket.chassis] : undefined
  return ROCKET_MODELS.find(model => model.id === id) ?? ROCKET_MODELS[0]
}

/**
 * Return the canonical unibody loadout for a purchasable model. Keeping this
 * mapping beside the model catalogue means choosing a vehicle updates both
 * the purchase record and the assembly/debrief systems, rather than only
 * changing the label shown in the selector.
 */
export function rocketConfigForModel(model: Pick<RocketModel, 'id'> | null | undefined): RocketConfig {
  switch (model?.id) {
    case ROCKET_IDS.prospector:
      return { chassis: 'hull-mk2', propulsion: 'fusion-b2', drill: 'laser-t2' }
    case ROCKET_IDS.explorer:
    default:
      return { chassis: 'hull-mk1', propulsion: 'ion-a1', drill: 'hand-drill' }
  }
}

export function rocketDisplayForConfig(rocket: Pick<RocketConfig, 'chassis'> | null | undefined): {
  name: string
  img: string
} {
  const model = rocketModelForConfig(rocket)
  return { name: model.name, img: model.img }
}

/** Resolve an old catalog identifier without reintroducing it into runtime data. */
export function canonicalRocketId(id: string): string {
  return LEGACY_ROCKET_IDS[id as keyof typeof LEGACY_ROCKET_IDS] ?? id
}
