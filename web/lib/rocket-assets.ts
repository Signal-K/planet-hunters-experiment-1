/**
 * The only runtime mapping between a canonical rocket and its art. All
 * surfaces deliberately resolve through this map so a new body cannot drift
 * between mining, launchpad, blueprint, transit, and menu treatments.
 */
export const ROCKET_ASSETS = {
  explorer: {
    exterior: '/game/assets/ships/ship_sr1.png',
    blueprint: '/game/assets/ships/containers/sr1_cutaway.png',
  },
  prospector: {
    exterior: '/game/assets/ships/ship_sr2.png',
    blueprint: '/game/assets/ships/containers/sr2_cutaway.png',
  },
} as const

export type RocketAssetId = keyof typeof ROCKET_ASSETS

export function rocketAssetsForId(id: string): (typeof ROCKET_ASSETS)[RocketAssetId] {
  return ROCKET_ASSETS[id as RocketAssetId] ?? ROCKET_ASSETS.explorer
}
