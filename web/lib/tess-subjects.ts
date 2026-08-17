import { pbShared } from '@/lib/pb'
import { isReviewableTessSubject, toTessCandidate, type TessCandidate } from '@/lib/data'

export const REVIEWABLE_TESS_SUBJECT_FILTER = [
  'subject_type = "transit"',
  'gold_label = ""',
  '(consensus = "" || consensus = "unsure")',
].join(' && ')

export async function fetchReviewableTessCandidates(): Promise<TessCandidate[]> {
  // Shared auth can disappear between an effect's guard and its request
  // (logout, expired restore, or a cleared storage session). Treat that as an
  // empty feed instead of issuing a guaranteed 401 from a background poll.
  if (!pbShared.authStore.isValid) return []
  const records = await pbShared.collection('subjects').getFullList({
    filter: REVIEWABLE_TESS_SUBJECT_FILTER,
    sort: '-created',
    // The observatory screen and the instrument-feed notification poll can
    // legitimately request this same list at the same time. PocketBase's
    // default request-key auto-cancellation makes one consumer abort the
    // other, which the screen then misreports as "Live Feed Unavailable".
    requestKey: null,
  })

  return records
    .filter(isReviewableTessSubject)
    .map(toTessCandidate)
}

export interface LastConfirmedDiscovery {
  lastConfirmedAt: string | null
  subjectId: string | null
}

// Backs the global "immediate re-pick" notification — see
// GET /api/ss/subjects/last-confirmed in ~/Navigation/backend/main.go.
export async function fetchLastConfirmed(): Promise<LastConfirmedDiscovery> {
  if (!pbShared.authStore.isValid) return { lastConfirmedAt: null, subjectId: null }
  const result = await pbShared.send<{ lastConfirmedAt: string | null; subjectId?: string }>(
    '/api/ss/subjects/last-confirmed',
    { method: 'GET' },
  )
  return { lastConfirmedAt: result.lastConfirmedAt ?? null, subjectId: result.subjectId ?? null }
}
