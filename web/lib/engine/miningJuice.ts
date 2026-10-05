/**
 * Game-feel rules for the mining scene, kept pure so they are unit-tested and
 * shared in spirit with the native port (native/LandnamCore/Mining/Juice.swift).
 */
export type HitKind = 'hit' | 'collect'

/** Real-time freeze (seconds) applied to the whole scene when the laser connects. */
export const HIT_STOP_SECONDS: Record<HitKind, number> = { hit: 0.04, collect: 0.09 }

/** Hit-stop length, or 0 when the player asked for reduced motion. */
export function hitStopSeconds(kind: HitKind, reducedMotion: boolean): number {
  return reducedMotion ? 0 : HIT_STOP_SECONDS[kind]
}

/**
 * Advances a hit-stop. Returns the scene dt to simulate and the remaining
 * freeze: while frozen the world gets dt 0 so ore, lasers and sparks all hold.
 * Frozen time is consumed from the real dt; leftovers carry into the sim step so
 * a long frame never swallows more than the freeze itself.
 */
export function stepHitStop(remaining: number, dt: number): { simDt: number; remaining: number } {
  if (remaining <= 0) return { simDt: dt, remaining: 0 }
  const left = remaining - dt
  return left > 0 ? { simDt: 0, remaining: left } : { simDt: -left, remaining: 0 }
}

/** Ease-in-out cubic, used by pickup chips flying to the ship. */
export function easeInOutCubic(t: number): number {
  const c = Math.min(1, Math.max(0, t))
  return c < 0.5 ? 4 * c * c * c : 1 - Math.pow(-2 * c + 2, 3) / 2
}

/** Position of a pickup chip `t` (0..1) of the way from `from` to `to`, with a small upward pop first. */
export function pickupPosition(from: { x: number; y: number }, to: { x: number; y: number }, t: number, popPx = 14): { x: number; y: number } {
  const e = easeInOutCubic(t)
  const pop = Math.sin(Math.min(1, t * 1.6) * Math.PI) * popPx * (1 - t)
  return { x: from.x + (to.x - from.x) * e, y: from.y + (to.y - from.y) * e - pop }
}

/** Ship recoil (px, upward kick that settles) `t` seconds after firing. */
export function recoilOffset(t: number, kickPx = 5, settleSeconds = 0.18): number {
  if (t < 0 || t >= settleSeconds) return 0
  const k = 1 - t / settleSeconds
  return -kickPx * k * k
}
