// The Orionids 2026 event is over. Its shower run is closed to everyone except:
//  - players who took part while it ran (they keep it, to replay), and
//  - players who spent research currency on the archive unlock in the research marketplace.
// Earning the badge or any fragment during the window counts as taking part.

import { isOrionidsWindow } from '@/lib/data/sky-events'
import type { Player } from '@/lib/game-types'

export const ORIONIDS_ARCHIVE_ITEM_ID = 'orionids-archive'

type AccessPlayer = Pick<Player, 'orionidsEventStage' | 'orionidsFragments' | 'badges' | 'researchPurchases'>

/** True for anyone who started the Orionids while it was on. These fields only ever fill inside the window. */
export function orionidsParticipated(player: Pick<AccessPlayer, 'orionidsEventStage' | 'orionidsFragments' | 'badges'>): boolean {
  return (player.orionidsEventStage ?? 0) >= 1
    || (player.orionidsFragments?.caught ?? 0) > 0
    || !!player.badges?.['orionids-2026']
}

export function orionidsArchiveUnlocked(player: Pick<AccessPlayer, 'researchPurchases'>): boolean {
  return (player.researchPurchases?.[ORIONIDS_ARCHIVE_ITEM_ID] ?? 0) > 0
}

/** The shower run can be offered and played: in the window, by a participant, or from the archive. */
export function orionidsRunAvailable(player: AccessPlayer | undefined, now: number): boolean {
  if (isOrionidsWindow(now)) return true
  return !!player && (orionidsParticipated(player) || orionidsArchiveUnlocked(player))
}

/** The cosmetic sky is for anyone who did the Orionids or bought the archive. It is off until they turn it on. */
export function orionidsSkyEarned(player: AccessPlayer): boolean {
  return orionidsParticipated(player) || orionidsArchiveUnlocked(player)
}

export function orionidsSkyOn(player: AccessPlayer & Pick<Player, 'orionidsSkyEffect'>): boolean {
  return player.orionidsSkyEffect === true && orionidsSkyEarned(player)
}
