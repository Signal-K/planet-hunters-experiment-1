import type { GameState, Player } from '@/lib/game-types'
import { buildingLevel } from '@/lib/data/building-levels'
import { GROUND_TELESCOPE_IDS } from '@/lib/systems/InstrumentFeedSystem'

// SSL-889: legacy construction progress becomes agency unlocks.
//
// Before the agency model, what a player could do came from what stood on their Base (`placed`, `buildingLevels`,
// `controlBuilt`, `remoteStorage`, ground telescopes). Gameplay paths that gate on a building will be retired in
// favour of the agency programme, so every capability a building gave must first be recorded as an agency unlock.
//
// Rules:
//  * Derived, not authoritative over the buildings. Nothing about the buildings, balances, stash, silo or remote
//    storage, research, completed missions, client or tech progress, delivery run or in-flight construction is read
//    for mutation. The only write is `player.agencyUnlocks`.
//  * Only ever grows. A building that is later removed, or a save from a device that has not translated yet, can
//    never take an unlock away (merge unions the two lists).
//  * Re-runnable. A job still in `underConstruction` or an active `resourceFocus` grants nothing yet; when it
//    completes the next load adds its unlock. Active deliveries are untouched so they finish as they were.
//  * Stage 2 (colonisation and construction sandbox) stays a deferred design decision: no unlock is created for it.

/** Capabilities the Base used to grant, by name. Each is an agency capability, not a building. */
export const AGENCY_UNLOCKS = [
  'launch', 'heavy-hulls', 'bulk-hulls', 'ore-storage', 'refining', 'exchange', 'rocket-discounts',
  'data-hub', 'probe-fleet', 'ground-telescope', 'remote-storage',
] as const
export type AgencyUnlockId = typeof AGENCY_UNLOCKS[number]

type TranslatePlayer = Pick<Player,
  'placed' | 'buildingLevels' | 'launchpadUpgraded' | 'controlBuilt' | 'underConstruction' | 'remoteStorage' | 'agencyUnlocks'>

function standing(player: TranslatePlayer, kind: string): boolean {
  return !!player.placed?.includes(kind) && !(player.underConstruction && kind in player.underConstruction)
}

/** The unlocks the Base currently earns, in a stable order. Pure over the player. */
export function constructionUnlocks(player: TranslatePlayer): AgencyUnlockId[] {
  const out = new Set<AgencyUnlockId>()
  if (standing(player, 'launchpad')) {
    out.add('launch')
    const level = buildingLevel(player, 'launchpad')
    if (level >= 2) out.add('heavy-hulls')
    if (level >= 3) out.add('bulk-hulls')
  }
  if (standing(player, 'surface-silo')) out.add('ore-storage')
  if (standing(player, 'refinery')) out.add('refining')
  if (standing(player, 'market')) out.add('exchange')
  if (standing(player, 'hangar') && buildingLevel(player, 'hangar') >= 2) out.add('rocket-discounts')
  // The retired job-board flag is the oldest way to have had a control station.
  if (standing(player, 'control-station') || player.controlBuilt) out.add('data-hub')
  if (standing(player, 'control-station') && player.placed?.some(id => id.startsWith('probe'))) out.add('probe-fleet')
  if (GROUND_TELESCOPE_IDS.some(id => standing(player, id))) out.add('ground-telescope')
  if (Object.values(player.remoteStorage ?? {}).some(store => Object.values(store).some(n => n > 0))) out.add('remote-storage')
  return AGENCY_UNLOCKS.filter(id => out.has(id))
}

/** Union of two unlock lists in the stable order; unknown ids from a newer client are kept at the end. */
export function mergeAgencyUnlocks(a: readonly string[] | undefined, b: readonly string[] | undefined): string[] {
  const all = new Set([...(a ?? []), ...(b ?? [])])
  const known = AGENCY_UNLOCKS.filter(id => all.has(id))
  return [...known, ...[...all].filter(id => !(AGENCY_UNLOCKS as readonly string[]).includes(id)).sort()]
}

/** Record what the Base earns as agency unlocks. Returns the same state when nothing is new. */
export function translateConstruction(state: GameState): GameState {
  const merged = mergeAgencyUnlocks(state.player.agencyUnlocks, constructionUnlocks(state.player))
  const current = state.player.agencyUnlocks ?? []
  if (merged.length === current.length && merged.every((id, i) => id === current[i])) return state
  return { ...state, player: { ...state.player, agencyUnlocks: merged } }
}

/** True when an unlock was earned, however the player got there. Gameplay that retires a building check reads this. */
export function hasAgencyUnlock(player: Pick<TranslatePlayer, 'agencyUnlocks'>, id: AgencyUnlockId): boolean {
  return !!player.agencyUnlocks?.includes(id)
}
