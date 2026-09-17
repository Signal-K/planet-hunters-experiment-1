export const LAUNCH_TIMELINE = {
  countdownStart: 0.0,
  ignitionStart: 2.6,
  liftoff: 3.5,
  boosterSep: 6.4,
  stageSep: 8.2,
  upperAtmos: 9.4,
  blackout: 10.6,
  orbit: 11.2,
  departureBurn: 12.8,
  fadeOut: 14.2,
  done: 15.0,
} as const

export const LAUNCH_W = 390
export const LAUNCH_H = 780

/** Wall-clock seconds for one launch tick, capped so a hitch cannot skip the cinematic. */
export function launchFrameDt(deltaMS: number): number {
  if (!Number.isFinite(deltaMS) || deltaMS <= 0) return 0
  return Math.min(0.05, deltaMS / 1000)
}
