import { ASTEROID_SETTLED_LABELS, TESS_SETTLED_LABELS, isSettledConsensusValue } from '../open-anomaly.ts'
import { isNasaOpenDisposition, normalizeTempDesig, normalizeToiId } from './sources.ts'
import {
  ASTEROID_CANDIDATES_COLLECTION,
  DEFAULT_INGEST_LIMITS,
  TESS_SUBJECTS_COLLECTION,
  type ExistingAsteroidCandidate,
  type ExistingTessSubject,
  type IngestLimits,
  type IngestPlan,
  type NeocpSourceRow,
  type PlannedInsert,
  type TessToiSourceRow,
} from './types.ts'

export interface IngestPool {
  tess: ExistingTessSubject[]
  asteroids: ExistingAsteroidCandidate[]
}

function tessIdentity(toi: string): string {
  return normalizeToiId(toi)
}

function asteroidIdentity(desig: string): string {
  return normalizeTempDesig(desig)
}

function isExistingTessSettled(row: ExistingTessSubject): boolean {
  return isSettledConsensusValue(row.consensus, TESS_SETTLED_LABELS)
    || isSettledConsensusValue(row.goldLabel, TESS_SETTLED_LABELS)
}

function isExistingAsteroidSettled(row: ExistingAsteroidCandidate): boolean {
  if (row.resolved === true) return true
  return isSettledConsensusValue(row.consensus, ASTEROID_SETTLED_LABELS)
    || isSettledConsensusValue(row.goldLabel, ASTEROID_SETTLED_LABELS)
}

export function tessSubjectPayload(row: TessToiSourceRow): Record<string, string | number | boolean> {
  return {
    subject_type: 'transit',
    tic_id: row.ticId,
    toi_id: row.toi,
    sectors: row.sectors,
    period_days: row.periodDays,
    depth_pct: row.depthPct,
    ...(row.starTeffK != null ? { st_teff: row.starTeffK } : {}),
    // Leave consensus untouched on insert — empty is "open". Never invent a
    // gold label from NASA disposition; that is a different authority.
    gold_label: '',
    consensus: '',
  }
}

export function asteroidCandidatePayload(row: NeocpSourceRow): Record<string, string | number | boolean> {
  return {
    temp_desig: row.tempDesig,
    score: row.score,
    discovery_date: row.discoveryDate,
    ra: row.ra,
    decl: row.decl,
    v_mag: row.vMag,
    h_mag: row.hMag,
    n_obs: row.nObs,
    arc_days: row.arcDays,
    last_seen_days: row.lastSeenDays,
    resolved: false,
  }
}

/**
 * Insert-only plan against the shared pool.
 *
 * - Never deletes or updates an existing row (that would dry or reopen consensus).
 * - Never inserts NASA-settled TOIs (KP/CP/FP).
 * - Caps each source so a single run cannot flood the pool.
 */
export function planSharedSubjectIngest(
  tessRows: TessToiSourceRow[],
  neocpRows: NeocpSourceRow[],
  pool: IngestPool,
  limits: IngestLimits = DEFAULT_INGEST_LIMITS,
): IngestPlan {
  const existingTess = new Map(pool.tess.map(row => [tessIdentity(row.toiId), row]))
  const existingAsteroids = new Map(pool.asteroids.map(row => [asteroidIdentity(row.tempDesig), row]))

  const tessInserted: PlannedInsert[] = []
  let tessSkippedExisting = 0
  let tessSkippedSettled = 0
  let tessSkippedClosedSource = 0

  for (const row of tessRows) {
    if (tessInserted.length >= limits.tess) break
    const identity = tessIdentity(row.toi)
    if (!identity) continue
    if (!isNasaOpenDisposition(row.disposition)) {
      tessSkippedClosedSource += 1
      continue
    }
    const existing = existingTess.get(identity)
    if (existing) {
      if (isExistingTessSettled(existing)) tessSkippedSettled += 1
      else tessSkippedExisting += 1
      continue
    }
    tessInserted.push({
      collection: TESS_SUBJECTS_COLLECTION,
      identity,
      payload: tessSubjectPayload(row),
    })
  }

  const neocpInserted: PlannedInsert[] = []
  let neocpSkippedExisting = 0
  let neocpSkippedSettled = 0

  for (const row of neocpRows) {
    if (neocpInserted.length >= limits.neocp) break
    const identity = asteroidIdentity(row.tempDesig)
    if (!identity) continue
    const existing = existingAsteroids.get(identity)
    if (existing) {
      if (isExistingAsteroidSettled(existing)) neocpSkippedSettled += 1
      else neocpSkippedExisting += 1
      continue
    }
    neocpInserted.push({
      collection: ASTEROID_CANDIDATES_COLLECTION,
      identity,
      payload: asteroidCandidatePayload(row),
    })
  }

  const notes: string[] = [
    'Insert-only into shared PocketBase. Existing consensus/gold_label/resolved are never overwritten.',
    'Spectra is not ingested here — it soft-hooks the same pool later.',
    'asteroid_candidates payloads omit consensus/gold_label because those fields are not on the live collection.',
  ]

  return {
    tessInserted,
    tessSkippedExisting,
    tessSkippedSettled,
    tessSkippedClosedSource,
    neocpInserted,
    neocpSkippedExisting,
    neocpSkippedSettled,
    notes,
  }
}
