/** How far the destination has drifted in from the right. 0 is held just inside the right edge, 1 is parked. */
export function transitBodyReveal(progress: number): number {
  const p = Math.min(100, Math.max(0, progress))
  return Math.min(1, p / 40)
}

/** Translate percent that parks the body (0) or holds it just inside the right edge. */
export function transitBodyShiftPercent(progress: number): number {
  return Math.round((1 - transitBodyReveal(progress)) * 26)
}
