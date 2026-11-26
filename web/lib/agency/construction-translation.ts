import type { GameState, Player } from '@/lib/game-types'
import { buildingLevel, MAX_BUILDING_LEVEL, type UpgradableBuildingId } from '@/lib/data/building-levels'
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
  'placed' | 'buildingLevels' | 'launchpadUpgraded' | 'controlBuilt' | 'underConstruction' | 'remoteStorage' | 'agencyUnlocks' | 'agencyLevels'>

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
  const withLevels = translateAgencyLevels(state)
  const merged = mergeAgencyUnlocks(withLevels.player.agencyUnlocks, constructionUnlocks(withLevels.player))
  const current = withLevels.player.agencyUnlocks ?? []
  if (merged.length === current.length && merged.every((id, i) => id === current[i])) return withLevels
  return { ...withLevels, player: { ...withLevels.player, agencyUnlocks: merged } }
}

/** True when an unlock was earned, however the player got there. Gameplay that retires a building check reads this. */
export function hasAgencyUnlock(player: Pick<TranslatePlayer, 'agencyUnlocks'>, id: AgencyUnlockId): boolean {
  return !!player.agencyUnlocks?.includes(id)
}

// ---- Agency levels (SSL-892) ----
//
// Unlocks say "has it"; several benefits also depend on how far it was upgraded (exchange bonus, silo capacity, hangar
// discount, probe pace). Those levels are recorded here, separately from the Base buildings, so the benefits survive
// when construction is deferred. `buildingLevels` and `placed` are kept untouched as the reference for later construction.

/** Level-bearing agency capabilities and the Base building each one comes from. */
export const AGENCY_LEVEL_SOURCES = {
  launch: 'launchpad',
  'ore-storage': 'surface-silo',
  refining: 'refinery',
  exchange: 'market',
  'rocket-discounts': 'hangar',
  'data-hub': 'control-station',
} as const satisfies Record<string, UpgradableBuildingId>
export type AgencyLevelId = keyof typeof AGENCY_LEVEL_SOURCES
const AGENCY_LEVEL_IDS = Object.keys(AGENCY_LEVEL_SOURCES) as AgencyLevelId[]

function clampAgencyLevel(value: unknown): number {
  const n = typeof value === 'number' && Number.isFinite(value) ? Math.floor(value) : 0
  return Math.min(MAX_BUILDING_LEVEL, Math.max(0, n))
}

/** Levels the player's buildings give today. A building counts as soon as it is placed, which is what the economy has always read. */
type LevelPlayer = Partial<Pick<TranslatePlayer, 'placed' | 'buildingLevels' | 'launchpadUpgraded' | 'controlBuilt' | 'agencyLevels'>>

function placedLevels(player: LevelPlayer): Partial<Record<AgencyLevelId, number>> {
  const out: Partial<Record<AgencyLevelId, number>> = {}
  for (const id of AGENCY_LEVEL_IDS) {
    const kind = AGENCY_LEVEL_SOURCES[id]
    if (player.placed?.includes(kind)) out[id] = buildingLevel(player, kind)
  }
  if (!out['data-hub'] && player.controlBuilt) out['data-hub'] = 1
  return out
}

/** Per-id max, so a stale save on either side can never lower a level. Unknown ids are dropped. */
export function mergeAgencyLevels(a: Partial<Record<string, number>> | undefined, b: Partial<Record<string, number>> | undefined): Partial<Record<AgencyLevelId, number>> {
  const out: Partial<Record<AgencyLevelId, number>> = {}
  for (const id of AGENCY_LEVEL_IDS) {
    const level = Math.max(clampAgencyLevel(a?.[id]), clampAgencyLevel(b?.[id]))
    if (level > 0) out[id] = level
  }
  return out
}

/**
 * The level of an agency capability: 0 when never earned. It is the higher of the recorded level and what the
 * buildings give right now, so a player whose save has not been translated yet gets exactly the effect they had.
 */
export function agencyLevel(player: LevelPlayer, id: AgencyLevelId): number {
  return Math.max(clampAgencyLevel(player.agencyLevels?.[id]), placedLevels(player)[id] ?? 0)
}

/** Record the levels the Base has earned. Returns the same state when nothing is new. */
export function translateAgencyLevels(state: GameState): GameState {
  const merged = mergeAgencyLevels(state.player.agencyLevels, placedLevels(state.player))
  const current = state.player.agencyLevels ?? {}
  if (AGENCY_LEVEL_IDS.every(id => (merged[id] ?? 0) === (current[id] ?? 0))) return state
  return { ...state, player: { ...state.player, agencyLevels: merged } }
}
