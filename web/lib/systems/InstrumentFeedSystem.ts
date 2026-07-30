import { dailyTessCandidates, type TessCandidate } from '@/lib/data'
import type { Player } from '@/lib/game-types'

export const TRANSIT_TELESCOPE_INSTRUMENT_ID = 'transit-telescope'

type InstrumentFeedPlayer = Pick<
  Player,
  | 'satelliteMonitoringLevel'
  | 'transitSatelliteLevel'
  | 'satelliteTargetId'
  | 'tessClassifications'
  | 'instrumentDigestNotifiedOn'
>

export function instrumentDigestDateKey(now: Date = new Date()): string {
  return now.toISOString().slice(0, 10)
}

export function transitInstrumentLevel(player: InstrumentFeedPlayer): number {
  return Math.max(
    1,
    Math.floor(player.satelliteMonitoringLevel ?? 1),
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
  return transitInstrumentDigest(candidates, player, dateKey)
    .filter(candidate => !classifications[candidate.id])
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
