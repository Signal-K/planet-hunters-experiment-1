// Asteroid discovery citizen-science module (STS-622) — classification feed
// only for v1, no target-generation payoff yet (see ticket for the deferred
// confirmed-candidate -> minable target follow-up). Mirrors the shape and
// conventions of tess-candidates.ts as a second, independent instrument.

export type AsteroidVerdict = 'likely_real' | 'likely_artifact' | 'unsure'

export interface AsteroidCandidate {
  id: string
  tempDesig: string
  score: number
  discoveryDate: string
  ra: number
  decl: number
  vMag: number
  hMag: number
  nObs: number
  arcDays: number
  lastSeenDays: number
  resolved: boolean
}

export interface AsteroidClassification {
  candidateId: string
  verdict: AsteroidVerdict
  submittedAt: number
}

function hashId(id: string): number {
  let h = 2166136261
  for (let i = 0; i < id.length; i += 1) {
    h ^= id.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

export function nextUnclassifiedAsteroidCandidate(
  candidates: AsteroidCandidate[],
  classifications: Record<string, AsteroidClassification> = {}
): AsteroidCandidate | null {
  return candidates.find(candidate => !classifications[candidate.id]) ?? candidates[0] ?? null
}

// Deterministic UTC-daily pick, level-scaled — same convention as
// dailyTessCandidates, but with no preferredId/pointing concept: asteroid
// discovery is a passive digest, not a player-aimed instrument.
export function dailyAsteroidCandidates(
  candidates: AsteroidCandidate[],
  dateKey: string,
  telescopeLevel = 1
): AsteroidCandidate[] {
  if (candidates.length === 0) return []
  const dailyCount = Math.min(candidates.length, Math.max(1, Math.floor(telescopeLevel)))
  const picked: AsteroidCandidate[] = []
  const start = hashId(dateKey) % candidates.length
  for (let offset = 0; picked.length < dailyCount && offset < candidates.length; offset += 1) {
    const candidate = candidates[(start + offset) % candidates.length]
    if (!picked.some(existing => existing.id === candidate.id)) picked.push(candidate)
  }
  return picked
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function isReviewableAsteroidCandidate(record: any): boolean {
  return record.resolved !== true
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function toAsteroidCandidate(record: any): AsteroidCandidate {
  return {
    id: String(record.id ?? record.temp_desig ?? 'candidate'),
    tempDesig: String(record.temp_desig ?? record.id ?? 'candidate'),
    score: Number(record.score ?? 0),
    discoveryDate: String(record.discovery_date ?? ''),
    ra: Number(record.ra ?? 0),
    decl: Number(record.decl ?? 0),
    vMag: Number(record.v_mag ?? 0),
    hMag: Number(record.h_mag ?? 0),
    nObs: Number(record.n_obs ?? 0),
    arcDays: Number(record.arc_days ?? 0),
    lastSeenDays: Number(record.last_seen_days ?? 0),
    resolved: Boolean(record.resolved),
  }
}
