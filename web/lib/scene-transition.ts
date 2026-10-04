/**
 * Scene-to-scene motion (SSL-441).
 *
 * Every routed change fades through the dark command-deck backdrop.
 * Three hops in the flight loop use a short in-world move on top of that
 * fade: the rocket leaving the pad, arrival at a body, and the return
 * into debrief. Total motion stays inside 250–450ms. Reduced motion skips
 * the hold and swaps immediately (see SceneTransition).
 */

export const SCENE_TRANSITION_OUT_MS = 180
export const SCENE_TRANSITION_IN_MS = 200

export type SceneTransitionKind = 'fade' | 'climb' | 'arrival' | 'debrief'

const ARRIVAL_SCREENS = new Set(['mining', 'rover-mining', 'landing', 'delivery'])

export function sceneTransitionDurationMs(): number {
  return SCENE_TRANSITION_OUT_MS + SCENE_TRANSITION_IN_MS
}

export function transitionKind(from: string, to: string): SceneTransitionKind {
  if (from === to) return 'fade'
  if (from === 'launch' && to === 'transit') return 'climb'
  if (to === 'debrief' && (from === 'transit' || from === 'landing')) return 'debrief'
  if (from === 'transit' && ARRIVAL_SCREENS.has(to)) return 'arrival'
  if (from === 'landing' && (to === 'mining' || to === 'rover-mining')) return 'arrival'
  return 'fade'
}
