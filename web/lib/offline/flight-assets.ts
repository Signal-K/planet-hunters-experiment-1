import { KIT_ROCKET_SPACE } from '@/lib/kit-rocket'

/** Warm the entire flight kit at Base, before the first return leg needs it. */
export const FLIGHT_ASSET_URLS = [
  KIT_ROCKET_SPACE,
  ...['earth-pixel', 'asteroid-pixel', 'space-bands', 'stars-far', 'stars-mid', 'stars-near', 'flame-0', 'flame-1', 'flame-2'].map(name => `/game/assets/base/kit/${name}.png`),
]
