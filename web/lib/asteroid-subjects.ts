import { pbShared } from '@/lib/pb'
import { isReviewableAsteroidCandidate, toAsteroidCandidate, type AsteroidCandidate } from '@/lib/data'

export const REVIEWABLE_ASTEROID_CANDIDATE_FILTER = 'resolved = false'

export async function fetchReviewableAsteroidCandidates(): Promise<AsteroidCandidate[]> {
  const records = await pbShared.collection('asteroid_candidates').getFullList({
    filter: REVIEWABLE_ASTEROID_CANDIDATE_FILTER,
    sort: '-created',
  })

  return records
    .filter(isReviewableAsteroidCandidate)
    .map(toAsteroidCandidate)
}
