import type { Target } from './types'

export const BASE_LASER_CHARGES = 5

/** The 07/09 QA pass set the current baseline to one quarter of the former wait. */
export const TRAVEL_TIME_SCALE = 0.25

export function travelDurationMs(target: Target, msPerOrbit = 2 * 60 * 1000): number {
  return target.orbit * msPerOrbit * TRAVEL_TIME_SCALE
}
