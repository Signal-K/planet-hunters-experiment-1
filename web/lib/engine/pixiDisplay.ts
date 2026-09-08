// Single source of truth for Pixi display tuning (KES native-feel perf pass).
//
// Every Pixi Application in the game was initialising with
// `resolution: window.devicePixelRatio` UNCAPPED. On a 3x-DPR phone that is
// ~9x the backing-store pixels of a 1x display, and with `antialias: true`
// (MSAA) on top the fill-rate cost is what makes the game feel laggy on real
// devices while running fine on a desktop. Capping the render resolution to 2
// keeps text/vector art crisp on retina screens while roughly halving the
// fill-rate on high-DPR phones.
//
// See Bjorn's native-feel perf diagnosis (Symptom A).

/**
 * Device pixel ratio, clamped so we never render at more than `max` backing
 * pixels per CSS pixel. SSR-safe (returns 1 when `window` is unavailable).
 */
export function capDpr(max = 2): number {
  if (typeof window === 'undefined') return 1
  return Math.min(window.devicePixelRatio || 1, max)
}
