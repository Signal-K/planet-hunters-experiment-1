// Saturn imager citizen-science module (SSL-492). Cassini ISS frames from the
// Zooniverse "Saturn Thunderstorm Search" project (project 24787, subject set
// 124285). Mirrors asteroid-candidates.ts as a third, independent instrument.
//
// The shared science pool (SSC-43) is not built yet, so this module ships a
// static fallback seed of real subjects (subject id, OPUS ID, image URL) pulled
// from the public Panoptes API. `toSaturnCandidate` accepts the future pool
// record shape so the feed can switch over without touching the screen.

export type SaturnVerdict = 'yes' | 'no' | 'maybe'

export const SATURN_QUESTION = 'Is there a storm cloud in the image?'

export interface SaturnCandidate {
  id: string
  /** Zooniverse subject id, when the frame came from the Zooniverse set. */
  subjectId: string
  /** OPUS ID of the Cassini ISS observation, e.g. co-iss-n1473456649. */
  opusId: string
  imageUrl: string
}

export interface SaturnClassification {
  candidateId: string
  verdict: SaturnVerdict
  submittedAt: number
  /**
   * SSL-491: gold during the Saturn event period, silver after, null before
   * (see resolveSaturnBadgeTier in sky-events.ts).
   */
  badgeTier: 'gold' | 'silver' | null
}

/** Fixed single-frame-per-day digest; the Saturn imager has no level scaling. */
export const SATURN_IMAGER_DAILY_COUNT = 1

// Cassini ISS browse frames from Zooniverse subject set 124285 (real data).
export const SATURN_FALLBACK_FRAMES: ReadonlyArray<{ subjectId: string; opusId: string; imageUrl: string }> = [
  { subjectId: '104549055', opusId: 'co-iss-n1473456649', imageUrl: 'https://panoptes-uploads.zooniverse.org/subject_location/c28ee649-e98b-4330-8286-de0dd88cc9d0.png' },
  { subjectId: '104549056', opusId: 'co-iss-n1473457312', imageUrl: 'https://panoptes-uploads.zooniverse.org/subject_location/a081e2de-2d0b-4025-a69a-299b57257bd0.png' },
  { subjectId: '104549057', opusId: 'co-iss-n1473457958', imageUrl: 'https://panoptes-uploads.zooniverse.org/subject_location/6452d1ef-da0e-4c9b-b47b-9e2186584f2a.png' },
  { subjectId: '104549058', opusId: 'co-iss-n1473461442', imageUrl: 'https://panoptes-uploads.zooniverse.org/subject_location/48d33ffd-375c-4cca-92c8-b095ddd9b776.png' },
  { subjectId: '104549059', opusId: 'co-iss-n1473462049', imageUrl: 'https://panoptes-uploads.zooniverse.org/subject_location/3544e631-ee70-4bd1-98fa-46b50f8c1959.png' },
  { subjectId: '104549061', opusId: 'co-iss-n1473462712', imageUrl: 'https://panoptes-uploads.zooniverse.org/subject_location/4aab5465-68f2-4fd0-a890-7fae5b34b368.png' },
  { subjectId: '104549062', opusId: 'co-iss-n1473463358', imageUrl: 'https://panoptes-uploads.zooniverse.org/subject_location/94c6ea41-83eb-4b17-a58f-ba288b112f4f.png' },
  { subjectId: '104549063', opusId: 'co-iss-n1473466842', imageUrl: 'https://panoptes-uploads.zooniverse.org/subject_location/f55adcc3-5f62-4b4d-94ae-d26d8fc05326.png' },
  { subjectId: '104549064', opusId: 'co-iss-n1473467449', imageUrl: 'https://panoptes-uploads.zooniverse.org/subject_location/c2a81a73-551a-4850-9c9e-9ad3a8f6d80c.png' },
  { subjectId: '104549065', opusId: 'co-iss-n1473468112', imageUrl: 'https://panoptes-uploads.zooniverse.org/subject_location/8b2c2c27-4095-452d-8f02-e6cee4da3189.png' },
  { subjectId: '104549066', opusId: 'co-iss-n1473468758', imageUrl: 'https://panoptes-uploads.zooniverse.org/subject_location/58ebb977-92a5-4714-8d24-4eb561cd4d0f.png' },
  { subjectId: '104549067', opusId: 'co-iss-n1473472242', imageUrl: 'https://panoptes-uploads.zooniverse.org/subject_location/7808d1da-a96d-46ee-8bdf-5c13405a6c7f.png' },
  { subjectId: '104549069', opusId: 'co-iss-n1473472849', imageUrl: 'https://panoptes-uploads.zooniverse.org/subject_location/7f56d5f8-c4d9-4ace-a60f-847c898f7c1f.png' },
  { subjectId: '104549070', opusId: 'co-iss-n1473473512', imageUrl: 'https://panoptes-uploads.zooniverse.org/subject_location/715b9d91-c4f0-46e7-97a8-3a0047ab31cf.png' },
  { subjectId: '104549071', opusId: 'co-iss-n1473474158', imageUrl: 'https://panoptes-uploads.zooniverse.org/subject_location/6d70ccc2-8aa9-4d98-b230-4c0b2f1494e3.png' },
  { subjectId: '104549072', opusId: 'co-iss-n1473477642', imageUrl: 'https://panoptes-uploads.zooniverse.org/subject_location/63ef866a-0dae-467f-b2ef-d16cc2a732fa.png' },
  { subjectId: '104549073', opusId: 'co-iss-n1473478249', imageUrl: 'https://panoptes-uploads.zooniverse.org/subject_location/d7dd39cd-0e64-4a21-a579-c8147bdd0bf7.png' },
  { subjectId: '104549075', opusId: 'co-iss-n1473478912', imageUrl: 'https://panoptes-uploads.zooniverse.org/subject_location/eb876863-c531-4b3e-8493-f4933f164c21.png' },
  { subjectId: '104549076', opusId: 'co-iss-n1473479558', imageUrl: 'https://panoptes-uploads.zooniverse.org/subject_location/34af4174-6158-4725-a804-2bab6fbefed3.png' },
  { subjectId: '104549077', opusId: 'co-iss-n1473483042', imageUrl: 'https://panoptes-uploads.zooniverse.org/subject_location/048cc3ca-c48c-4e2d-940d-f8064a8b9de8.png' },
]

export const SATURN_FALLBACK_CANDIDATES: SaturnCandidate[] = SATURN_FALLBACK_FRAMES.map(frame => ({
  id: `saturn-${frame.subjectId}`,
  ...frame,
}))

function hashId(id: string): number {
  let h = 2166136261
  for (let i = 0; i < id.length; i += 1) {
    h ^= id.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

// Deterministic UTC-daily pick, same convention as dailyAsteroidCandidates.
export function dailySaturnCandidates(
  candidates: SaturnCandidate[],
  dateKey: string,
  count = SATURN_IMAGER_DAILY_COUNT
): SaturnCandidate[] {
  if (candidates.length === 0) return []
  const dailyCount = Math.min(candidates.length, Math.max(1, Math.floor(count)))
  const picked: SaturnCandidate[] = []
  const start = hashId(dateKey) % candidates.length
  for (let offset = 0; picked.length < dailyCount && offset < candidates.length; offset += 1) {
    const candidate = candidates[(start + offset) % candidates.length]
    if (!picked.some(existing => existing.id === candidate.id)) picked.push(candidate)
  }
  return picked
}

// Future shared-pool record (SSC-43). Field names are the expected shape and
// must be re-checked against the real schema when the pool lands.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function toSaturnCandidate(record: any): SaturnCandidate {
  const subjectId = String(record.subject_id ?? record.subjectId ?? record.id ?? '')
  return {
    id: String(record.id ?? `saturn-${subjectId}`),
    subjectId,
    opusId: String(record.opus_id ?? record.opusId ?? ''),
    imageUrl: String(record.image_url ?? record.imageUrl ?? ''),
  }
}

// Resolves the frame pool. Swap the body for a pool collection fetch once
// SSC-43 exists; callers already treat it as async and fallible.
export async function fetchReviewableSaturnCandidates(): Promise<SaturnCandidate[]> {
  return SATURN_FALLBACK_CANDIDATES
}
