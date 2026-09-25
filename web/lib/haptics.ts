/** Best-effort tactile feedback for instrument controls on touch devices. */

export type HapticKind = 'press' | 'drag' | 'change'

const PATTERNS: Record<HapticKind, number | number[]> = {
  press: 8,
  drag: 4,
  change: [6, 24, 6],
}

export function triggerHaptic(kind: HapticKind): void {
  if (typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') return
  try {
    navigator.vibrate(PATTERNS[kind])
  } catch {
    // Some browsers expose vibrate but reject calls outside a user gesture.
  }
}
