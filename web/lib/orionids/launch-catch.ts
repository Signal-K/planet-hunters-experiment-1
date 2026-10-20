// Orionids ascent catch (SSL-578). The rocket flies through the shower on
// the way up. Fragments are available any time in the window. Peak night
// doubles the catch. The 02:00 fireball stays a separate moment.

import { isOrionidsPeakNight, isOrionidsWindow, ORIONIDS_PEAK_MULTIPLIER } from '@/lib/data/sky-events'

/** Fragments one launch catches outside peak night. */
export const LAUNCH_CATCH_BASE = 2

export function fragmentsCaughtOnLaunch(at: number): number {
  if (!isOrionidsWindow(at)) return 0
  return isOrionidsPeakNight(at) ? LAUNCH_CATCH_BASE * ORIONIDS_PEAK_MULTIPLIER : LAUNCH_CATCH_BASE
}
