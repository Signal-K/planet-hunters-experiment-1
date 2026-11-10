import type { Screen } from '@/lib/game-types'

/**
 * Gameplay route names. This module is intentionally data-free: the server
 * page for `/game/[screen]` imports it while building static shells, and must
 * not pull in the catalog, Pixi, or the screen router.
 */
const SCREEN_LIST = {
  intro: true,
  build: true,
  hub: true,
  'hub-subsurface': true,
  missions: true,
  'tess-discovery': true,
  targets: true,
  fab: true,
  flight: true,
  landing: true,
  mining: true,
  delivery: true,
  debrief: true,
  refinery: true,
  market: true,
  hangar: true,
  'rocket-buy': true,
  launchpad: true,
  'asteroid-discovery': true,
  'saturn-storm-search': true,
  'radio-meteors': true,
  'instrument-hub': true,
  'mission-history': true,
  'narrative-ledger': true,
  'community-research': true,
  'sky-pointing': true,
} as const satisfies Record<Screen, true>

export const GAME_SCREENS: readonly Screen[] = Object.keys(SCREEN_LIST) as Screen[]

/**
 * Screens renamed in SSL-817. Saved state and old deep links still carry the
 * old ids, so every place that reads a stored or typed screen id goes through
 * `migrateScreenId`. `galaxy` was TESS classification; `transit` was the rocket
 * flight (the transit telescope is a different thing).
 */
export const LEGACY_SCREEN_IDS: Readonly<Record<string, Screen>> = { galaxy: 'tess-discovery', transit: 'flight' }

export function migrateScreenId<T>(screen: T): T | Screen {
  return typeof screen === 'string' && Object.prototype.hasOwnProperty.call(LEGACY_SCREEN_IDS, screen) ? LEGACY_SCREEN_IDS[screen] : screen
}

export const VALID_SCREENS = new Set<Screen>(GAME_SCREENS)

export function gameScreenParams(): { screen: Screen }[] {
  return GAME_SCREENS.map(screen => ({ screen }))
}
