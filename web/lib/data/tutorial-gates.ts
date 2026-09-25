// Mission-count gates. Kept out of rockets.ts: mission-generator -> payouts
// -> rockets would otherwise form an import cycle.

import type { RocketModel } from './types'
import { FREE_OPS_START_MISSIONS_DONE } from './mission-generator'

/**
 * Mission-count requirements only order the tutorial (M1 unlocks Prospector).
 * From Free Operations on, nothing is gated by mission count; cost and a
 * model being built at all (`locked`) are the only limits.
 */
export function missionsRequirementMet(missionsRequired: number | undefined, missionsDone: number): boolean {
  return !missionsRequired || missionsDone >= FREE_OPS_START_MISSIONS_DONE || missionsDone >= missionsRequired
}

export function rocketModelAvailable(model: RocketModel, missionsDone: number): boolean {
  return !model.locked && missionsRequirementMet(model.missionsRequired, missionsDone)
}
