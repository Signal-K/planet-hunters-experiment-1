// Joint Atlas "Looked up" reward (SSL-578). Atlas writes one event_badges
// row. Landnam reads it and grants its own badge plus research. The Atlas
// row is not overwritten: its subject is check-in, and the Landnam badge
// uses a different subject.

import type { BadgeTier, PlayerBadge } from '@/lib/data/sky-events'
import type { Player } from '@/lib/game-types'

export const LOOKED_UP_EVENT_ID = 'orionids-2026'
export const LOOKED_UP_SUBJECT_ID = 'check-in'
export const LOOKED_UP_MARKER = 'after-moonset'
export const LOOKED_UP_BADGE_ID = 'orionids-looked-up'
/** Landnam's own badge row. Distinct from the Atlas check-in subject. */
export const LOOKED_UP_LANDNAM_SUBJECT = 'looked-up'
/** A chart is 30. This check-in is the smaller grant. */
export const LOOKED_UP_RESEARCH_XP = 25

export interface AtlasBadgeRow {
  event_id?: string
  subject_id?: string
  marker?: string
  tier?: string
  earned_at?: number
}

type LookedUpPlayer = Pick<Player, 'badges' | 'researchXP' | 'orionidsLookedUpAt'>

export function isAtlasLookedUp(row: AtlasBadgeRow): boolean {
  return row.event_id === LOOKED_UP_EVENT_ID
    && row.subject_id === LOOKED_UP_SUBJECT_ID
    && row.marker === LOOKED_UP_MARKER
    && (row.tier === 'gold' || row.tier === 'silver')
}

/** Idempotent. The same player reference comes back once the badge is held. */
export function grantLookedUp<T extends LookedUpPlayer>(player: T, at: number, tier: BadgeTier): T {
  if (!Number.isFinite(at)) return player
  const existing = player.badges?.[LOOKED_UP_BADGE_ID]
  if (existing && (existing.tier === 'gold' || tier === 'silver')) return player
  const badge: PlayerBadge = { eventId: LOOKED_UP_BADGE_ID, tier, earnedAt: at }
  return {
    ...player,
    orionidsLookedUpAt: player.orionidsLookedUpAt ?? at,
    researchXP: (player.researchXP ?? 0) + (existing ? 0 : LOOKED_UP_RESEARCH_XP),
    badges: { ...(player.badges ?? {}), [LOOKED_UP_BADGE_ID]: badge },
  }
}
