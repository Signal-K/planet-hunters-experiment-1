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
  // Sequence 3 (M3) is exclusively the authored transport-contractor list
  // above — drop any generically-generated sequence-3 bands so the M3 board
  // only ever shows the curated contractor choices.
  return generateMissionsFromRules({ contractors: CONTRACTOR_SLOTS, minerals: MINERAL_META }, count)
    .filter(m => m.sequence !== 3)
}

export function generateFreeOpsMissions(): Mission[] {
  return generateFreeOpsMissionsFromRules({ contractors: CONTRACTOR_SLOTS, minerals: MINERAL_META })
}

// M3 onboarding: the player picks between two contractors offering a
// two-leg transport job (mine at the pickup target, deliver to a second
// target, then fly home) — the self-directed "Independent Prospect" custom
// mining mission that used to fill this slot has been cut; self-directed
// mining now lives in Free Ops instead (see generateFreeOpsMissions).
export const M3_SEQUENCE = 3

export const AUTHORED_MISSIONS: Mission[] = [
  {
    id: 'lnm_m3_relay_bennu_vesta',
    title: 'Belt Courier Run',
    brief: 'Atlas Aggregate needs iron and carbon lifted from Bennu, then dropped at their Vesta depot before you head home. Two stops, one payout.',
    contractor: 'atlas-aggregate',
    tag: 'TRANSPORT',
    difficulty: 'L1',
    locked: false,
    sequence: M3_SEQUENCE,
    unlockAt: 'Complete 2 contracts',
    targetId: 'bennu',
    deliveryTargetId: 'vesta',
    requires: {
      minerals: { iron: 3, carbon: 2 },
      cargo_min: 5,
      drill_tier: 1,
      max_orbit: 4,
    },
    payout: {
      francs: 600_000,
      affinity: 3,
    },
  },
  {
    id: 'lnm_m3_relay_itokawa_eros',
    title: 'Nickel Line Handoff',
    brief: 'Helioforge Metals needs nickel pulled from Itokawa, then handed off at Eros before you fly home. Two stops, one payout.',
    contractor: 'helioforge-metals',
    tag: 'TRANSPORT',
    difficulty: 'L1',
    locked: false,
    sequence: M3_SEQUENCE,
    unlockAt: 'Complete 2 contracts',
    targetId: 'itokawa',
    deliveryTargetId: 'eros',
    requires: {
      minerals: { nickel: 3 },
      cargo_min: 3,
      drill_tier: 1,
      max_orbit: 4,
    },
    payout: {
      francs: 600_000,
      affinity: 3,
    },
  },
  {
    id: 'lnm_relay_psyche_ceres',
    title: 'Deep-Core Relay',
    brief: 'Kepler Materials needs nickel and cobalt extracted at 16 Psyche, then ferried onward to their Ceres depot before you fly home. Two stops, one payout.',
    contractor: 'kepler-materials',
    tag: 'TRANSPORT',
    difficulty: 'L2',
    locked: false,
    sequence: FREE_OPS_START_MISSIONS_DONE + 1,
    unlockAt: 'Complete 3 contracts',
    targetId: 'psyche',
    deliveryTargetId: 'ceres',
    requires: {
      minerals: { nickel: 2, cobalt: 2 },
      cargo_min: 4,
      drill_tier: 1,
      max_orbit: 5,
    },
    payout: {
      francs: 900_000,
      affinity: 4,
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
