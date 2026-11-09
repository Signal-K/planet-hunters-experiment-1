// Shower run (SSL-651, per shower since SSL-658). The run's 20 fragments are counted from the
// moment the run is accepted, not from the lifetime ledger. Counting the
// ledger let a player who had once caught 20 start every later run already
// filled, and paying out on that would have paid every run for one launch.
// A run that predates the baseline field (no number saved) falls back to the
// ledger, as before, and settles once.
// Each shower counts only its own ledger: a Leonid run ignores Orionid catches.

import type { Player } from '@/lib/game-types'
import { calibrateOnboardingPayout } from '@/lib/data'
import { ORIONIDS_FRAGMENT_GOAL, showerRunMission } from '@/lib/data/missions'
import { ORIONIDS_SHOWER_ID, getShower } from '@/lib/data/showers'
import { setShowerRunBaseline, showerLedger, showerRunBaseline } from '@/lib/orionids/shower-ledger'

type RunPlayer = Pick<Player, 'orionidsFragments' | 'orionidsRunBaseline' | 'showerFragments' | 'showerRunBaselines'>

/** Catches landed since this run was accepted: launch catches plus mined fragments. */
export function showerRunCatches(player: RunPlayer, showerId: string = ORIONIDS_SHOWER_ID): number {
  return Math.max(0, showerLedger(player, showerId).caught - showerRunBaseline(player, showerId))
}

export function showerRunFilled(player: RunPlayer, showerId: string = ORIONIDS_SHOWER_ID): boolean {
  return showerRunCatches(player, showerId) >= ORIONIDS_FRAGMENT_GOAL
}

/** Mark the ledger count at accept, so the order starts at zero. */
export function startShowerRun<T extends RunPlayer>(player: T, showerId: string = ORIONIDS_SHOWER_ID): T {
  return setShowerRunBaseline(player, showerId)
}

/** The francs the run pays on return, through the same onboarding floor the debrief shows. */
export function showerRunPayout(missionsDone: number, showerId: string = ORIONIDS_SHOWER_ID): number {
  return calibrateOnboardingPayout(showerRunMission(showerId).payout.francs, missionsDone)
}

/** Credit the payout once and reset the count, so a second collect finds the order empty. */
export function settleShowerRun<T extends RunPlayer & { francs: number }>(player: T, missionsDone: number, showerId: string = ORIONIDS_SHOWER_ID): T {
  if (!showerRunFilled(player, showerId)) return player
  return {
    ...startShowerRun(player, showerId),
    francs: player.francs + showerRunPayout(missionsDone, showerId),
  }
}

/** The haul without the shower's fragments: a filled run keeps them as fragments, not as a sale. */
export function withoutShowerFragments(cargo: Record<string, number>, showerId: string = ORIONIDS_SHOWER_ID): Record<string, number> {
  const resourceId = (getShower(showerId) ?? getShower(ORIONIDS_SHOWER_ID)!).resourceId
  const { [resourceId]: _kept, ...rest } = cargo
  return rest
}
