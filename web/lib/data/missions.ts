// Landnam game data — mission fallback assembled by the deterministic generator

import type { Mission } from './types'
import { CONTRACTOR_SLOTS } from './contractors'
import { MINERAL_META } from './minerals'
import {
  DEFAULT_MISSION_TEMPLATES,
  FREE_OPS_START_MISSIONS_DONE,
  OFFLINE_MISSION_COUNT,
  generateFreeOpsMissionsFromRules,
  generateMissionsFromRules,
} from './mission-generator'

export { FREE_OPS_START_MISSIONS_DONE, OFFLINE_MISSION_COUNT }
export const MISSION_TEMPLATES = DEFAULT_MISSION_TEMPLATES

export function generateMissions(count = OFFLINE_MISSION_COUNT): Mission[] {
  return generateMissionsFromRules({ contractors: CONTRACTOR_SLOTS, minerals: MINERAL_META }, count)
}

export function generateFreeOpsMissions(): Mission[] {
  return generateFreeOpsMissionsFromRules({ contractors: CONTRACTOR_SLOTS, minerals: MINERAL_META })
}

export const AUTHORED_MISSIONS: Mission[] = [
  {
    id: 'lnm_m3_custom_mining',
    title: 'Independent Prospect',
    brief: 'No contractor this time. Pick a reachable target, mine what looks valuable, and bring the haul home for your own account. This is the start of custom operations.',
    tag: 'FREE OPS',
    difficulty: 'L2',
    locked: false,
    sequence: 3,
    unlockAt: 'Complete 2 contracts',
    requires: {
      minerals: { palladium: 2 },
      cargo_min: 4,
      drill_tier: 1,
      max_orbit: 6,
    },
    payout: {
      francs: 0,
      affinity: 0,
    },
  },
]

export const MISSIONS: Mission[] = [...generateMissions(), ...AUTHORED_MISSIONS, ...generateFreeOpsMissions()]

// Baseline cost of assembling the starter SR1 rocket (hull-mk1 + ion-a1 + hand-drill).
// Used as the reference point for onboarding payout floors.
export const STARTER_ROCKET_COST = 500_000

/**
 * Ensures the first mission pays generously (floor at 1.5× rocket cost) and
 * early follow-up missions nudge toward a normal economy (1.15× target).
 *
 * @param rawNet - the raw payout before calibration
 * @param missionsDone - missions completed before this one
 */
export function calibrateOnboardingPayout(rawNet: number, missionsDone: number): number {
  if (missionsDone === 0) {
    return Math.max(rawNet, Math.round(STARTER_ROCKET_COST * 1.5))
  }
  if (missionsDone === 1) {
    const target = Math.round(STARTER_ROCKET_COST * 1.15)
    // Nudge toward target: average rawNet with the target floor rather than hard-snapping.
    return Math.max(rawNet, Math.round((rawNet + target) / 2))
  }
  return rawNet
}
