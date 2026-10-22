// Orionids shower run (SSL-651). The run's 20 fragments are counted from the
// moment the run is accepted, not from the lifetime ledger. Counting the
// ledger let a player who had once caught 20 start every later run already
// filled, and paying out on that would have paid every run for one launch.
// A run that predates the baseline field (no number saved) falls back to the
// ledger, as before, and settles once.

import type { Player } from '@/lib/game-types'
import { calibrateOnboardingPayout } from '@/lib/data'
import { ORIONIDS_FRAGMENT_GOAL, orionidsNightRun } from '@/lib/data/missions'
import { ORIONID_DEBRIS_ID, sanitizeFragments } from '@/lib/orionids/fragments'

type RunPlayer = Pick<Player, 'orionidsFragments' | 'orionidsRunBaseline'>

function baselineOf(player: RunPlayer): number {
  const base = player.orionidsRunBaseline
  return typeof base === 'number' && Number.isFinite(base) && base > 0 ? Math.floor(base) : 0
}

/** Catches landed since this run was accepted: launch catches plus mined fragments. */
export function showerRunCatches(player: RunPlayer): number {
  return Math.max(0, sanitizeFragments(player.orionidsFragments).caught - baselineOf(player))
}

export function showerRunFilled(player: RunPlayer): boolean {
  return showerRunCatches(player) >= ORIONIDS_FRAGMENT_GOAL
}

/** Mark the ledger count at accept, so the order starts at zero. */
export function startShowerRun<T extends RunPlayer>(player: T): T {
  return { ...player, orionidsRunBaseline: sanitizeFragments(player.orionidsFragments).caught }
}

/** The francs the run pays on return, through the same onboarding floor the debrief shows. */
export function showerRunPayout(missionsDone: number): number {
  return calibrateOnboardingPayout(orionidsNightRun().payout.francs, missionsDone)
}

/** Credit the payout once and reset the count, so a second collect finds the order empty. */
export function settleShowerRun<T extends RunPlayer & { francs: number }>(player: T, missionsDone: number): T {
  if (!showerRunFilled(player)) return player
  return {
    ...startShowerRun(player),
    francs: player.francs + showerRunPayout(missionsDone),
  }
}

/** The haul without the fragments: a filled run keeps them as fragments, not as a sale. */
export function withoutShowerFragments(cargo: Record<string, number>): Record<string, number> {
  const { [ORIONID_DEBRIS_ID]: _kept, ...rest } = cargo
  return rest
}
