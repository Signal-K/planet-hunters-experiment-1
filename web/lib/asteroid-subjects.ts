import { ASTEROID_CANDIDATE_SORT, REVIEWABLE_ASTEROID_CANDIDATE_FILTER } from '@/lib/citizen-science/open-anomaly'
import { pbShared } from '@/lib/pb'
import { isReviewableAsteroidCandidate, toAsteroidCandidate, type AsteroidCandidate } from '@/lib/data'

export { REVIEWABLE_ASTEROID_CANDIDATE_FILTER }

export async function fetchReviewableAsteroidCandidates(): Promise<AsteroidCandidate[]> {
  const records = await pbShared.collection('asteroid_candidates').getFullList({
    filter: REVIEWABLE_ASTEROID_CANDIDATE_FILTER,
    // This collection defines `created` (unlike `subjects` — SSL-10). Do not
    // add consensus/gold_label to the server filter; those fields are absent
    // on the live shared collection and would 400 the feed.
    sort: ASTEROID_CANDIDATE_SORT,
    // Hub, telescope, and notification consumers can poll together. Do not
    // let PocketBase's default request-key cancellation make the feed appear
    // empty when the later consumer aborts the earlier one.
    requestKey: null,
  })

  return records
    .filter(isReviewableAsteroidCandidate)
    .map(toAsteroidCandidate)
}
