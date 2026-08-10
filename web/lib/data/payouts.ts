// Mission payouts are contract fees, not the resale value of the ore alone.
// The old formula produced millions while rocket manufacture costs
// billions, forcing onboarding calibration to display a misleading jackpot.
//
// All payout-floor policy lives here. It used to be spread across three
// places — `MISSION_PAYOUT_FLOORS` here, `calibrateOnboardingPayout` in
// missions.ts, and hardcoded figures on the authored missions — which made it
// impossible to answer "what does mission N pay?" from any single file.

import { ROCKET_MODELS } from './rockets'
import { CARGO_BONUS_CAP, CONTRACT_FEES, CONTRACT_FEE_STEP } from './economy'

export const MISSION_PAYOUT_FLOORS = CONTRACT_FEES

export function missionPayoutFloor(sequence: number): number {
  if (sequence <= 1) return CONTRACT_FEES[1]
  if (sequence === 2) return CONTRACT_FEES[2]
  if (sequence === 3) return CONTRACT_FEES[3]
  return CONTRACT_FEES[4] + (sequence - 4) * CONTRACT_FEE_STEP
}

/**
 * A contract pays its base fee plus a bonus for the specific cargo it asks
 * for, capped so same-tier contracts stay in a readable band.
 *
 * The cap used to be the whole story: the generator fed in a figure computed
 * as `oreValue x 1500 x multipliers`, which against a 1.5B floor contributed
 * under 1% — so every mission paid exactly its floor and the cargo made no
 * difference. On the current scale the bonus is a real 0-18% swing.
 */
export function normalizeMissionPayout(raw: number, sequence: number): number {
  if (!Number.isFinite(raw) || raw <= 0) return missionPayoutFloor(sequence)
  const fee = missionPayoutFloor(sequence)
  return Math.round(fee + Math.min(raw, fee * CARGO_BONUS_CAP))
}

// Cost of the Prospector — the rocket M2 forces every onboarding player
// to buy (see DEFAULT_COMPLEXITY_BANDS comment in mission-generator.ts). Used
// as the reference point for onboarding payout floors. The purchase gate
// sits between M1 and M2 — you must already own it to fly M2 — so M1's floor
// alone (not "M1+M2 combined") has to cover the purchase; M2's payout arrives
// too late to help fund it.
export const ONBOARDING_ROCKET_COST = ROCKET_MODELS.find(r => r.name === 'Prospector')?.costFrancs ?? 1_300_000_000

/** Onboarding floor: 1.05× the Prospector's cost for the first two missions. */
const ONBOARDING_PAYOUT_FLOOR = Math.round(ONBOARDING_ROCKET_COST * 1.05)

/**
 * Ensures each of the first two missions pays enough on its own to afford the
 * mandatory Prospector purchase gating M2, since that purchase happens before M2's
 * payout is ever collected.
 *
 * Idempotent (it is a floor, not a bonus), which is what kept the old
 * double-application — Debrief calibrated for display, then the game loop
 * calibrated the already-calibrated figure again — from being a live bug. The
 * loop no longer re-applies it; the screen and the loop agree on one number.
 *
 * @param rawNet - the raw payout before calibration
 * @param missionsDone - missions completed before this one
 */
export function calibrateOnboardingPayout(rawNet: number, missionsDone: number): number {
  if (missionsDone <= 1) return Math.max(rawNet, ONBOARDING_PAYOUT_FLOOR)
  return rawNet
}
