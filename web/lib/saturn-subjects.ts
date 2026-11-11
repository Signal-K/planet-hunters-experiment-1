import { stageFeedOn } from '@/lib/stage-feed'
import { pbShared } from '@/lib/pb'
import { getSaturnFallbackCandidates, toSaturnCandidate, type SaturnCandidate } from '@/lib/data'

// Saturn Thunderstorm Search frames live in the shared science pool (SSC-43).
// Falls back to the static seed when the pool is unreachable or empty so the
// imager still works offline.
export async function fetchReviewableSaturnCandidates(): Promise<SaturnCandidate[]> {
  if (stageFeedOn()) return getSaturnFallbackCandidates()
  try {
    const records = await pbShared.collection('ss_saturn_storm_frames').getFullList({
      filter: 'retired = false',
      sort: 'subject_id',
      // Hub, imager screen and notifications can poll together; do not let
      // request-key auto-cancellation make the feed look empty.
      requestKey: null,
    })
    const candidates = records.map(toSaturnCandidate).filter(c => c.subjectId && c.imageUrl)
    if (candidates.length > 0) {
      try { window.localStorage.setItem(POOL_KEY, JSON.stringify(candidates)) } catch { /* private mode or full */ }
      return candidates
    }
  } catch (error) {
    // SSL-828: offline, the last pool this device saw keeps the player's active frame (its image is in the
    // service worker's science cache) instead of swapping to a static seed frame.
    const saved = savedPool()
    if (saved.length > 0) return saved
    console.warn('[Saturn] shared pool unavailable, using static frames', error)
  }
  return getSaturnFallbackCandidates()
}

const POOL_KEY = 'ln-saturn-pool'

function savedPool(): SaturnCandidate[] {
  try {
    const parsed: unknown = JSON.parse(window.localStorage.getItem(POOL_KEY) ?? '[]')
    return Array.isArray(parsed) ? parsed.filter((c): c is SaturnCandidate => !!c && typeof c.id === 'string' && typeof c.imageUrl === 'string') : []
  } catch { return [] }
}
