import { pbShared } from '@/lib/pb'
import { isReviewableAsteroidCandidate, toAsteroidCandidate, type AsteroidCandidate } from '@/lib/data'

export const REVIEWABLE_ASTEROID_CANDIDATE_FILTER = 'resolved = false'

export async function fetchReviewableAsteroidCandidates(): Promise<AsteroidCandidate[]> {
  if (!pbShared.authStore.isValid) return []
  const records = await pbShared.collection('asteroid_candidates').getFullList({
    filter: REVIEWABLE_ASTEROID_CANDIDATE_FILTER,
    sort: '-created',
    // Hub, telescope, and notification consumers can poll together. Do not
    // let PocketBase's default request-key cancellation make the feed appear
    // empty when the later consumer aborts the earlier one.
    requestKey: null,
  })

  return records
    .filter(isReviewableAsteroidCandidate)
    .map(toAsteroidCandidate)
}
