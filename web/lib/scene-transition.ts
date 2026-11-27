

export type SceneTransitionKind = 'fade' | 'climb' | 'arrival' | 'debrief'

const ARRIVAL_SCREENS = new Set(['mining', 'landing', 'delivery'])

export function sceneTransitionTiming(kind: SceneTransitionKind): { out: number; in: number } {
  return kind === 'fade'
    ? { out: SCENE_TRANSITION_OUT_MS, in: SCENE_TRANSITION_IN_MS }
    : { out: CINEMATIC_TRANSITION_OUT_MS, in: CINEMATIC_TRANSITION_IN_MS }
}

export function sceneTransitionDurationMs(kind: SceneTransitionKind = 'fade'): number {
  const timing = sceneTransitionTiming(kind)
  return timing.out + timing.in
}

export function transitionKind(from: string, to: string): SceneTransitionKind {
  if (from === to) return 'fade'
  if (from === 'launch' && to === 'transit') return 'climb'
  if (to === 'debrief' && (from === 'transit' || from === 'landing')) return 'debrief'
  if (from === 'transit' && ARRIVAL_SCREENS.has(to)) return 'arrival'
  if (from === 'landing' && to === 'mining') return 'arrival'
  return 'fade'
}

/**
 * Scene-to-scene motion (SSL-441).
 *
 * Ordinary routed changes swap immediately. Three hops in the flight loop
 * retain a short in-world move: the rocket leaving the pad, arrival at a
 * body, and the return into debrief. Reduced motion skips every hold.
 */

const SCENE_TRANSITION_OUT_MS = 0

const SCENE_TRANSITION_IN_MS = 0

const CINEMATIC_TRANSITION_OUT_MS = 180

const CINEMATIC_TRANSITION_IN_MS = 200
