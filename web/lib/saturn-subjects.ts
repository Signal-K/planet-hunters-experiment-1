import { pbShared } from '@/lib/pb'
import { getSaturnFallbackCandidates, toSaturnCandidate, type SaturnCandidate } from '@/lib/data'

// Saturn Thunderstorm Search frames live in the shared science pool (SSC-43).
// Falls back to the static seed when the pool is unreachable or empty so the
// imager still works offline.
export async function fetchReviewableSaturnCandidates(): Promise<SaturnCandidate[]> {
  try {
    const records = await pbShared.collection('ss_saturn_storm_frames').getFullList({
      filter: 'retired = false',
      sort: 'subject_id',
      // Hub, imager screen and notifications can poll together; do not let
      // request-key auto-cancellation make the feed look empty.
      requestKey: null,
    })
    const candidates = records.map(toSaturnCandidate).filter(c => c.subjectId && c.imageUrl)
    if (candidates.length > 0) return candidates
  } catch (error) {
    console.warn('[Saturn] shared pool unavailable, using static frames', error)
  }
  return getSaturnFallbackCandidates()
}
