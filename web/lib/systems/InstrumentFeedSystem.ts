import { dailyTessCandidates, dailyAsteroidCandidates, type TessCandidate, type AsteroidCandidate } from '@/lib/data'
import type { Player } from '@/lib/game-types'

export const TRANSIT_TELESCOPE_INSTRUMENT_ID = 'transit-telescope'
export const DEEP_SPACE_TELESCOPE_INSTRUMENT_ID = 'deep-space-telescope'

type InstrumentFeedPlayer = Pick<
  Player,
  | 'transitSatelliteLevel'
  | 'transitSatelliteLevel'
  | 'satelliteTargetId'
  | 'tessClassifications'
  | 'instrumentDigestNotifiedOn'
>

type DeepSpaceInstrumentFeedPlayer = Pick<
  Player,
  | 'deepSpaceTelescopeLevel'
  | 'asteroidClassifications'
  | 'instrumentDigestNotifiedOn'
>

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
 * The authoritative UTC-daily digest for the player's transit telescope.
 * Candidate selection remains deterministic and level-scaled; this wrapper
 * keeps the Hub badge, feed screen, and notification pipeline in agreement.
 */
export function transitInstrumentDigest(
  candidates: TessCandidate[],
  player: InstrumentFeedPlayer,
  dateKey: string
): TessCandidate[] {
  return dailyTessCandidates(
    candidates,
    dateKey,
    transitInstrumentLevel(player),
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
 * The Deep Space Telescope's daily asteroid-discovery (NEOCP) digest
 * (STS-622) — a second, independent instrument feed alongside the transit
 * telescope above. No pointing-target concept: unlike the transit satellite,
 * the telescope digest is a passive downlink, not player-aimed.
 */
export function deepSpaceInstrumentDigest(
  candidates: AsteroidCandidate[],
  player: DeepSpaceInstrumentFeedPlayer,
  dateKey: string
): AsteroidCandidate[] {
  return dailyAsteroidCandidates(candidates, dateKey, deepSpaceInstrumentLevel(player))
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
