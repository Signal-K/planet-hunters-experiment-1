import sceneNames from './scene-names.json'

/**
 * The one scene-name table (`web/lib/scene-names.json`). Native loads the same
 * file from the app bundle. Names are for accessibility labels and route
 * metadata. Scenes do not render them as titles.
 */
export const SCENE_NAMES = {
  base: sceneNames.base,
  hub: sceneNames.hub,
  exchange: sceneNames.exchange,
  build: sceneNames.build,
  launchpad: sceneNames.launchpad,
  market: sceneNames.market,
  mining: sceneNames.mining,
  transit: sceneNames.transit,
} as const
