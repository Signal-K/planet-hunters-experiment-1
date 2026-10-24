import type { Screen } from '@/lib/game-types'

/**
 * Where every screen sits in the narrative (decided 2026-10-24, docs/narrative-audit.md).
 * The spine is five stops: Plan, Launch, Flight, Work, Result. Everything else is the
 * base the player returns to, an optional extension, or parked. Adding a Screen without
 * classifying it here fails the typecheck.
 */
export type NarrativeRole =
  | 'plan' | 'launch' | 'flight' | 'work' | 'result'
  | 'base'       // the yard the loop starts and ends in
  | 'service'    // Free Ops base buildings: sell, store, refine, fit a ship
  | 'extension'  // optional, hangs off the loop, ships with its own fixture

export const NARRATIVE_ROLE: Record<Screen, NarrativeRole> = {
  intro: 'base',
  build: 'base',
  hub: 'base',
  'hub-subsurface': 'service',
  missions: 'plan',
  targets: 'plan',
  'rocket-buy': 'plan',
  launchpad: 'launch',
  fab: 'launch',
  transit: 'flight',
  landing: 'flight',
  mining: 'work',
  delivery: 'work',
  debrief: 'result',
  market: 'service',
  refinery: 'service',
  hangar: 'service',
  'mission-history': 'service',
  'narrative-ledger': 'service',
  'rover-survey': 'extension',
  'instrument-hub': 'extension',
  galaxy: 'extension',
  'asteroid-discovery': 'extension',
  'saturn-storm-search': 'extension',
}

export const SPINE: readonly NarrativeRole[] = ['plan', 'launch', 'flight', 'work', 'result']

export const screensWithRole = (role: NarrativeRole): Screen[] =>
  (Object.keys(NARRATIVE_ROLE) as Screen[]).filter(s => NARRATIVE_ROLE[s] === role)
