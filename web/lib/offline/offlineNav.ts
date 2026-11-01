// SSL-729: the game screen lives in GameState and the [screen] route page only
// mirrors the URL, so a screen change never needs the network. Next's
// router.push fetched the route's RSC payload anyway; offline (or on a
// connection that only looks online) that fetch failed, Next fell back to a
// full page load, and the player landed on the offline page (Back then "worked"
// because the state had already moved). So screen changes write the URL with
// history.pushState, which Next keeps in its router without a fetch, and
// Back/Forward are replayed from the path here.

import { VALID_SCREENS } from '@/lib/game-screens'
import type { Screen } from '@/lib/game-types'

export function pushScreenPath(path: string): void {
  window.history.pushState({ landnamScreen: true }, '', path)
}

/** The game screen a /game/<screen> path names, or null for anything else. */
export function screenForPath(pathname: string): Screen | null {
  const match = /^\/game\/([^/?#]+)/.exec(pathname)
  const screen = match?.[1]
  return screen && VALID_SCREENS.has(screen as Screen) ? screen as Screen : null
}
