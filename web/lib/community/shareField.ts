// SSL-320: publish a field build as a read-only creation share.
// Shared by SurfaceOpsScreen and RoverMiningScreen so both produce the same
// post shape (programme `surface-builds`, kind `creation`, friends by default).

import type { CreationSnapshot } from '@/lib/data/community'
import { CommunityApiError, publishShare } from './client'

export interface ShareFieldResult {
  ok: boolean
  /** Copy the host can show in its field notice slot. */
  message: string
}

export async function shareFieldCreation(
  snapshot: CreationSnapshot,
  targetName: string,
  visibility: 'friends' | 'public' = 'friends',
): Promise<ShareFieldResult> {
  if (snapshot.structures.length === 0) {
    return { ok: false, message: 'Build something before sharing the field.' }
  }
  const counts = snapshot.structures.reduce<Record<string, number>>((acc, s) => {
    acc[s.type] = (acc[s.type] ?? 0) + 1
    return acc
  }, {})
  const summary = Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .map(([type, n]) => `${n} ${type.replace(/-/g, ' ')}`)
    .join(', ')
  try {
    await publishShare({
      kind: 'creation',
      programmeId: 'surface-builds',
      title: `${targetName} field · ${snapshot.structures.length} structures`,
      summary: `${summary}. Life stage: ${snapshot.lifeStage}.`,
      visibility,
      targetId: snapshot.bodyId,
      snapshot: { ...snapshot },
    })
    return { ok: true, message: `Field shared with ${visibility === 'public' ? 'everyone' : 'your friends'}. Find it in the Community Hub.` }
  } catch (err) {
    const reason = err instanceof CommunityApiError ? err.message : 'Sign in to share to the hub.'
    return { ok: false, message: `Share failed: ${reason}` }
  }
}
