export const TESS_SUBJECTS_COLLECTION = 'subjects'
export const ASTEROID_CANDIDATES_COLLECTION = 'asteroid_candidates'

export const NASA_SETTLED_DISPOSITIONS = ['KP', 'CP', 'FP'] as const

export interface TessToiSourceRow {
  toi: string
  ticId: string
  disposition: string
  periodDays: number
  depthPct: number
  starTeffK?: number
  sectors: string
}

export interface NeocpSourceRow {
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
}

export interface ExistingTessSubject {
  toiId: string
  consensus?: unknown
  goldLabel?: unknown
}

export interface ExistingAsteroidCandidate {
  tempDesig: string
  resolved?: unknown
  consensus?: unknown
  goldLabel?: unknown
}

export interface PlannedInsert {
  collection: typeof TESS_SUBJECTS_COLLECTION | typeof ASTEROID_CANDIDATES_COLLECTION
  identity: string
  payload: Record<string, string | number | boolean>
}

export interface IngestPlan {
  tessInserted: PlannedInsert[]
  tessSkippedExisting: number
  tessSkippedSettled: number
  tessSkippedClosedSource: number
  neocpInserted: PlannedInsert[]
  neocpSkippedExisting: number
  neocpSkippedSettled: number
  notes: string[]
}

export interface IngestLimits {
  tess: number
  neocp: number
}

export const DEFAULT_INGEST_LIMITS: IngestLimits = {
  tess: 25,
  neocp: 25,
}
