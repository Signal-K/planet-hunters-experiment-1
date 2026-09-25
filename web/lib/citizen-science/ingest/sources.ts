import { NASA_SETTLED_DISPOSITIONS, type NeocpSourceRow, type TessToiSourceRow } from './types.ts'

export const NASA_TOI_TAP_URL = 'https://exoplanetarchive.ipac.caltech.edu/TAP/sync'
export const MPC_NEOCP_JSON_URL = 'https://www.minorplanetcenter.net/Extended_Files/neocp.json'

const INGEST_USER_AGENT = 'LandnamSharedSubjectIngest/1.0 (SSL-323; https://github.com/Signal-K/planet-hunters-experiment-1)'

export interface SourceFetch {
  fetch: typeof fetch
}

const OPEN_TESS_DISPOSITIONS = new Set(['', 'PC', 'APC'])

export function isNasaOpenDisposition(disposition: string): boolean {
  const normalized = disposition.trim().toUpperCase()
  if ((NASA_SETTLED_DISPOSITIONS as readonly string[]).includes(normalized)) return false
  return OPEN_TESS_DISPOSITIONS.has(normalized)
}

export function normalizeToiId(value: unknown): string {
  const raw = String(value ?? '').trim()
  if (!raw) return ''
  return raw.replace(/^TOI[- ]?/i, '')
}

export function normalizeTempDesig(value: unknown): string {
  return String(value ?? '').trim().toUpperCase()
}

function asNumber(value: unknown, fallback = 0): number {
  const n = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(n) ? n : fallback
}

export function parseTessToiRows(payload: unknown): TessToiSourceRow[] {
  if (!Array.isArray(payload)) return []
  const rows: TessToiSourceRow[] = []
  for (const item of payload) {
    if (!item || typeof item !== 'object') continue
    const record = item as Record<string, unknown>
    const toi = normalizeToiId(record.toi ?? record.toi_id)
    const ticId = String(record.tid ?? record.tic_id ?? '').trim()
    if (!toi || !ticId) continue
    const depthPpm = asNumber(record.pl_trandep ?? record.depth_ppm)
    rows.push({
      toi,
      ticId,
      disposition: String(record.tfopwg_disp ?? record.disposition ?? '').trim().toUpperCase(),
      periodDays: asNumber(record.pl_orbper ?? record.period_days, 3),
      depthPct: depthPpm > 0 ? Number((depthPpm / 10_000).toFixed(6)) : asNumber(record.depth_pct, 0.1),
      starTeffK: asNumber(record.st_teff) > 0 ? asNumber(record.st_teff) : undefined,
      sectors: String(record.sectors ?? '').trim(),
    })
  }
  return rows
}

export function parseNeocpRows(payload: unknown): NeocpSourceRow[] {
  const items = Array.isArray(payload)
    ? payload
    : payload && typeof payload === 'object' && Array.isArray((payload as { data?: unknown }).data)
      ? (payload as { data: unknown[] }).data
      : []
  const rows: NeocpSourceRow[] = []
  for (const item of items) {
    if (!item || typeof item !== 'object') continue
    const record = item as Record<string, unknown>
    const tempDesig = normalizeTempDesig(record.Temp_Desig ?? record.temp_desig ?? record.tempDesig)
    if (!tempDesig) continue
    const year = asNumber(record.Discovery_year)
    const month = asNumber(record.Discovery_month)
    const day = asNumber(record.Discovery_day)
    const discoveryDate = year > 0 && month > 0
      ? `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(Math.floor(day) || 1).padStart(2, '0')}`
      : String(record.discovery_date ?? '')
    rows.push({
      tempDesig,
      score: asNumber(record.Score ?? record.score),
      discoveryDate,
      ra: asNumber(record['R.A.'] ?? record.ra),
      decl: asNumber(record.Decl ?? record.decl),
      vMag: asNumber(record.V ?? record.v_mag),
      hMag: asNumber(record.H ?? record.h_mag),
      nObs: asNumber(record.NObs ?? record.n_obs),
      arcDays: asNumber(record.Arc ?? record.arc_days),
      lastSeenDays: asNumber(record.Not_Seen_dys ?? record.last_seen_days),
    })
  }
  return rows
}

function tapQuery(limit: number): string {
  // Public NASA Exoplanet Archive TAP — no API key. PC/APC/null are still
  // open planet-candidate rows; KP/CP/FP are already settled by TFOPWG.
  return [
    'select top ',
    Math.max(1, Math.min(limit, 200)),
    ' toi, tid, tfopwg_disp, pl_orbper, pl_trandep, pl_rade, st_teff, sectors',
    " from toi where tfopwg_disp is null or tfopwg_disp in ('PC','APC')",
    ' order by toi desc',
  ].join('')
}

export async function fetchOpenTessTois(client: SourceFetch, limit: number): Promise<TessToiSourceRow[]> {
  const url = new URL(NASA_TOI_TAP_URL)
  url.searchParams.set('query', tapQuery(limit * 2))
  url.searchParams.set('format', 'json')
  const response = await client.fetch(url, {
    headers: { Accept: 'application/json', 'User-Agent': INGEST_USER_AGENT },
  })
  if (!response.ok) {
    throw new Error(`NASA TAP TOI fetch failed: HTTP ${response.status}`)
  }
  const rows = parseTessToiRows(await response.json())
  return rows.filter(row => isNasaOpenDisposition(row.disposition)).slice(0, limit)
}

export async function fetchOpenNeocpCandidates(client: SourceFetch, limit: number): Promise<NeocpSourceRow[]> {
  const response = await client.fetch(MPC_NEOCP_JSON_URL, {
    headers: { Accept: 'application/json', 'User-Agent': INGEST_USER_AGENT },
  })
  if (!response.ok) {
    throw new Error(`MPC NEOCP fetch failed: HTTP ${response.status}`)
  }
  return parseNeocpRows(await response.json()).slice(0, limit)
}
