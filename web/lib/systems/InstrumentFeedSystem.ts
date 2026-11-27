import { sharedDaily } from '@/lib/agency/community'
import { type FleetPlayer } from '@/lib/agency/fleet'
import { fleetDataCount, type ConditionPlayer } from '@/lib/agency/condition'
import { SATURN_IMAGER_DAILY_COUNT } from '@/lib/data/saturn-candidates'
import { dailyTessCandidates, dailyAsteroidCandidates, dailySaturnCandidates, type TessCandidate, type AsteroidCandidate, type SaturnCandidate } from '@/lib/data'
import { isNewMoonDay } from '@/lib/data/sky-events'
import type { Player } from '@/lib/game-types'
import { groundTelescopeLevel } from '@/lib/ground-telescope-upgrades'

export const TRANSIT_TELESCOPE_INSTRUMENT_ID = 'transit-telescope'
export const DEEP_SPACE_TELESCOPE_INSTRUMENT_ID = 'deep-space-telescope'

export const NEW_MOON_EXTRA_ASTEROID_CANDIDATES = 1

/** Research XP the first classification of a transit subject pays. */
export const RESEARCH_XP_PER_FIRST_TESS_CLASSIFICATION = 15

/** Structure id of the ground telescope the player builds from the control station. */
export const GROUND_TELESCOPE_STRUCTURE_ID = 'ground-telescope'

/** Extra asteroid candidates a built ground telescope adds to each daily digest (Liam, 31.10). */
export const GROUND_TELESCOPE_EXTRA_ASTEROID_CANDIDATES = 1

/** SSL-802: every ground telescope a player can own, one per annex slot. The first keeps its old id. */
export const GROUND_TELESCOPE_IDS = [GROUND_TELESCOPE_STRUCTURE_ID, 'ground-telescope-2'] as const

export function isGroundTelescopeId(kind: string): boolean {
  return (GROUND_TELESCOPE_IDS as readonly string[]).includes(kind)
}

type GroundTelescopePlayer = {
  placed?: readonly string[]
  placementPlots?: Record<string, number>
  groundTelescopeGrandfathered?: boolean
  groundTelescopeLevels?: Record<string, number>
}

export function ownedGroundTelescopes(player: { placed?: readonly string[] }): string[] {
  return GROUND_TELESCOPE_IDS.filter(id => player.placed?.includes(id))
}

/** The next telescope id to build, or null when every annex slot already has one. */
export function nextGroundTelescopeId(player: { placed?: readonly string[] }): string | null {
  return GROUND_TELESCOPE_IDS.find(id => !player.placed?.includes(id)) ?? null
}

/** Annex save plots start at 10 (shared/layout/base-site.json). Kept local so this system stays free of the scene. */
const ANNEX_PLOT_MIN = 10

/**
 * SSL-802 (Liam, 16.11): a ground telescope observes once it stands on an annex slot. The one a player built before
 * this rule observes from the Unplaced tray too; telescopes built since must be placed first.
 */
export function groundTelescopeObserving(player: GroundTelescopePlayer, id: string): boolean {
  if (!player.placed?.includes(id)) return false
  const plot = player.placementPlots?.[id]
  if (typeof plot === 'number' && plot >= ANNEX_PLOT_MIN) return true
  return id === GROUND_TELESCOPE_STRUCTURE_ID && !!player.groundTelescopeGrandfathered
}

export function observingGroundTelescopes(player: GroundTelescopePlayer): number {
  return GROUND_TELESCOPE_IDS.filter(id => groundTelescopeObserving(player, id)).length
}

/**
 * The asteroid (NEOCP) feed is online once the player owns a ground telescope
 * or the orbiting Space Telescope. A ground telescope is cheaper and adds its
 * own candidates each day; the Space Telescope adds its level's worth.
 */
export function asteroidFeedOnline(player: { freeOperations?: boolean; deepSpaceTelescopeBuilt?: boolean } & GroundTelescopePlayer & Partial<Pick<Player, 'agencyCommunity'>>): boolean {
  return !!player.freeOperations && (!!player.deepSpaceTelescopeBuilt || observingGroundTelescopes(player) > 0 || sharedDaily(player, 'asteroid-discovery') > 0)
}

export const SATURN_IMAGER_INSTRUMENT_ID = 'saturn-imager'

export type InstrumentSignalKind = 'transit' | 'deep-space' | 'saturn'

export interface InstrumentSignal {
  id: string
  kind: InstrumentSignalKind
  instrumentId: string
  title: string
  subtitle: string
  inspectorScreen: 'tess-discovery' | 'asteroid-discovery' | 'saturn-storm-search'
}

type InstrumentFeedPlayer = Pick<
  Player,
  | 'transitSatelliteLevel'
  | 'satelliteTargetId'
  | 'tessClassifications'
  | 'instrumentDigestNotifiedOn'
> & ConditionPlayer & FleetPlayer & Partial<Pick<Player, 'agencyCommunity'>>

type DeepSpaceInstrumentFeedPlayer = Pick<
  Player,
  | 'deepSpaceTelescopeLevel'
  | 'asteroidClassifications'
  | 'deepSpaceTelescopeBuilt'
  | 'placed'
  | 'instrumentDigestNotifiedOn'
> & Partial<Pick<Player, 'placementPlots' | 'groundTelescopeGrandfathered' | 'groundTelescopeLevels'>> & FleetPlayer & Partial<Pick<Player, 'agencyCommunity'>>

export function instrumentDigestDateKey(now: Date = new Date()): string {
  return now.toISOString().slice(0, 10)
}

export function transitInstrumentLevel(player: InstrumentFeedPlayer): number {
  return Math.max(
    1,
    Math.floor(player.transitSatelliteLevel ?? 1)
  )
}

/**
 * The authoritative UTC-daily digest for the player's space telescope.
 * Candidate selection remains deterministic and level-scaled; this wrapper
 * keeps the Hub badge, feed screen, and notification pipeline in agreement.
 */
/** A daily feed is an allowance, not an endlessly refilling window. Older work never consumes today's data. */
function remainingToday(count: number, records: Record<string, { submittedAt?: number; completedAt?: number; cells?: Record<string, unknown> }> | undefined, dateKey: string): number {
  const done = Object.values(records ?? {}).filter(record => {
    if (record.cells && Object.keys(record.cells).length < 9) return false
    const at = record.completedAt ?? record.submittedAt
    return typeof at === 'number' && Number.isFinite(at) && new Date(at).toISOString().slice(0, 10) === dateKey
  }).length
  return Math.max(0, count - done)
}

export function transitInstrumentDigest(
  candidates: TessCandidate[],
  player: InstrumentFeedPlayer,
  dateKey: string
): TessCandidate[] {
  // SSL-852: a worn telescope sends half its light curves; a failed one sends none until it is serviced.
  const count = remainingToday(((player.transitSatelliteLaunchedAt || !sharedDaily(player, 'exoplanet-hunters')) ? fleetDataCount(player, 'space-telescope', transitInstrumentLevel(player), Date.parse(`${dateKey}T23:59:59Z`)) : 0) + sharedDaily(player, 'exoplanet-hunters'), player.tessClassifications, dateKey)
  if (count <= 0) return []
  return dailyTessCandidates(
    candidates,
    dateKey,
    count,
    player.satelliteTargetId
  )
}

export function unresolvedTransitInstrumentDigest(
  candidates: TessCandidate[],
  player: InstrumentFeedPlayer,
  dateKey: string
): TessCandidate[] {
  const classifications = player.tessClassifications ?? {}
  // Select the daily window from the still-reviewable pool. Filtering only
  // after the date hash could leave the digest empty forever when the hash
  // landed on a candidate the player classified yesterday, even though new
  // shared-feed data was available.
  return transitInstrumentDigest(
    candidates.filter(candidate => !classifications[candidate.id]),
    player,
    dateKey,
  )
}

export function deepSpaceInstrumentLevel(player: DeepSpaceInstrumentFeedPlayer): number {
  return Math.max(1, Math.floor(player.deepSpaceTelescopeLevel ?? 1))
}

/**
 * The Space Telescope's daily asteroid-discovery (NEOCP) digest
 * (STS-622) — a second, independent instrument feed alongside the transit
 * telescope above. No pointing-target concept: unlike the transit satellite,
 * the telescope digest is a passive downlink, not player-aimed.
 */
export function deepSpaceInstrumentDigest(
  candidates: AsteroidCandidate[],
  player: DeepSpaceInstrumentFeedPlayer,
  dateKey: string
): AsteroidCandidate[] {
  // SSL-491: on the UTC day of a new moon (monthly) the dark sky serves one
  // extra asteroid candidate. Deterministic: same dateKey, same digest.
  const extra = isNewMoonDay(dateKey) ? NEW_MOON_EXTRA_ASTEROID_CANDIDATES : 0
  // A player with only a ground telescope has no Space Telescope share.
  const space = player.deepSpaceTelescopeBuilt === false ? 0 : fleetDataCount(player, 'space-telescope', deepSpaceInstrumentLevel(player), Date.parse(`${dateKey}T23:59:59Z`))
  const ground = GROUND_TELESCOPE_IDS.reduce((sum, id) => sum + (groundTelescopeObserving(player, id) ? groundTelescopeLevel(player, id) : 0), 0)
  const shared = sharedDaily(player, 'asteroid-discovery')
  if (space + ground + shared === 0) return []
  const count = remainingToday(space + ground + shared + extra, player.asteroidClassifications, dateKey)
  return count > 0 ? dailyAsteroidCandidates(candidates, dateKey, count) : []
}

export function unresolvedDeepSpaceInstrumentDigest(
  candidates: AsteroidCandidate[],
  player: DeepSpaceInstrumentFeedPlayer,
  dateKey: string
): AsteroidCandidate[] {
  const classifications = player.asteroidClassifications ?? {}
  return deepSpaceInstrumentDigest(
    candidates.filter(candidate => !classifications[candidate.id]),
    player,
    dateKey,
  )
}

export function unresolvedSaturnInstrumentDigest(
  candidates: SaturnCandidate[],
  player: Pick<Player, 'saturnClassifications'> & ConditionPlayer & FleetPlayer & Partial<Pick<Player, 'agencyCommunity'>>,
  dateKey: string
): SaturnCandidate[] {
  const classifications = player.saturnClassifications ?? {}
  // SSL-852: a failed Saturn satellite sends no frames until it is serviced.
  const count = remainingToday(((player.saturnImagerLaunchedAt || !sharedDaily(player, 'saturn-storms')) ? fleetDataCount(player, 'saturn-satellite', SATURN_IMAGER_DAILY_COUNT, Date.parse(`${dateKey}T23:59:59Z`)) : 0) + sharedDaily(player, 'saturn-storms'), player.saturnClassifications, dateKey)
  if (count <= 0) return []
  return dailySaturnCandidates(candidates.filter(candidate => {
    const progress = classifications[candidate.id]
    // A legacy single-verdict record was the old whole-frame submission.
    // New records stay in the feed until all nine panes are complete.
    return !progress || (!!progress.cells && Object.keys(progress.cells).length < 9)
  }), dateKey, count)
}

export function instrumentDigestWasNotified(
  player: InstrumentFeedPlayer,
  instrumentId: string,
  dateKey: string
): boolean {
  return player.instrumentDigestNotifiedOn?.[instrumentId] === dateKey
}

export function markInstrumentDigestNotified(
  player: Player,
  instrumentId: string,
  dateKey: string
): Player {
  if (instrumentDigestWasNotified(player, instrumentId, dateKey)) return player
  return {
    ...player,
    instrumentDigestNotifiedOn: {
      ...(player.instrumentDigestNotifiedOn ?? {}),
      [instrumentId]: dateKey,
    },
  }
}

export function pickInstrumentInspectCandidate<T extends { id: string }>(
  digest: T[],
  inspectId?: string | null,
): T | null {
  if (inspectId) {
    const focused = digest.find(item => item.id === inspectId)
    if (focused) return focused
  }
  return digest[0] ?? null
}

export function collectInstrumentSignals(opts: {
  tess: TessCandidate[]
  asteroids: AsteroidCandidate[]
  saturn?: SaturnCandidate[]
  player: Pick<
    Player,
    | 'freeOperations'
    | 'transitSatelliteLaunchedAt'
    | 'deepSpaceTelescopeBuilt'
    | 'placed'
    | 'transitSatelliteLevel'
    | 'satelliteTargetId'
    | 'tessClassifications'
    | 'deepSpaceTelescopeLevel'
    | 'asteroidClassifications'
    | 'saturnImagerLaunchedAt'
    | 'saturnClassifications'
    | 'instrumentDigestNotifiedOn'
  > & Partial<Pick<Player, 'placementPlots' | 'groundTelescopeGrandfathered' | 'groundTelescopeLevels' | 'agencyCommunity'>> & ConditionPlayer & FleetPlayer
  dateKey: string
}): InstrumentSignal[] {
  const signals: InstrumentSignal[] = []
  if (opts.player.freeOperations && (opts.player.transitSatelliteLaunchedAt || sharedDaily(opts.player, 'exoplanet-hunters'))) {
    for (const item of unresolvedTransitInstrumentDigest(opts.tess, opts.player, opts.dateKey)) {
      signals.push({
        id: item.id,
        kind: 'transit',
        instrumentId: TRANSIT_TELESCOPE_INSTRUMENT_ID,
        title: item.toi,
        subtitle: `${item.host} · ${item.constellation} · S/N ${item.signalToNoise.toFixed(1)}`,
        inspectorScreen: 'tess-discovery',
      })
    }
  }
  if (asteroidFeedOnline(opts.player)) {
    for (const item of unresolvedDeepSpaceInstrumentDigest(opts.asteroids, opts.player, opts.dateKey)) {
      signals.push({
        id: item.id,
        kind: 'deep-space',
        instrumentId: DEEP_SPACE_TELESCOPE_INSTRUMENT_ID,
        title: item.tempDesig,
        subtitle: `V ${item.vMag.toFixed(1)} · score ${Math.round(item.score)}`,
        inspectorScreen: 'asteroid-discovery',
      })
    }
  }
  if (opts.player.freeOperations && (opts.player.saturnImagerLaunchedAt || sharedDaily(opts.player, 'saturn-storms'))) {
    for (const item of unresolvedSaturnInstrumentDigest(opts.saturn ?? [], opts.player, opts.dateKey)) {
      signals.push({
        id: item.id,
        kind: 'saturn',
        instrumentId: SATURN_IMAGER_INSTRUMENT_ID,
        title: item.opusId.toUpperCase(),
        subtitle: `Cassini ISS · ${item.opusId}`,
        inspectorScreen: 'saturn-storm-search',
      })
    }
  }
  return signals
}
