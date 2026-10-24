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
  galaxy: true,
  targets: true,
  fab: true,
  transit: true,
  landing: true,
  mining: true,
  delivery: true,
  debrief: true,
  refinery: true,
  market: true,
  hangar: true,
  'rocket-buy': true,
  'rover-survey': true,
  launchpad: true,
  'asteroid-discovery': true,
  'saturn-storm-search': true,
  'instrument-hub': true,
  'mission-history': true,
} as const satisfies Record<Screen, true>

export const GAME_SCREENS: readonly Screen[] = Object.keys(SCREEN_LIST) as Screen[]

export const VALID_SCREENS = new Set<Screen>(GAME_SCREENS)

export function gameScreenParams(): { screen: Screen }[] {
  return GAME_SCREENS.map(screen => ({ screen }))
}
