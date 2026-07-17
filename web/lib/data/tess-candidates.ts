import type { LightcurvePoint } from '@/components/game/LightcurvePlot'
import { mineralsForArchetype, type TargetArchetype } from './target-archetypes'

export type TessVerdict = 'planet' | 'not_planet' | 'unsure'

export interface TessCandidate {
  id: string
  ticId: string
  toi: string
  host: string
  sector: string
  constellation: string
  distanceLy: number
  planetRadiusEarth: number
  periodDays: number
  transitEpoch: number
  depthPpm: number
  signalToNoise: number
  lightcurvePoints?: LightcurvePoint[]
  // Host star effective temperature (Kelvin), from the NASA Exoplanet
  // Archive's st_teff column. Undefined for older/backfilled subjects that
  // predate this field — callers fall back to SUN_TEFF_K.
  starTeffK?: number
}

// A marked transit region: x1/x2 are lightcurve time positions (days),
// letting a player mark how *wide* a dip is, not just tap a single point.
export interface TransitRange {
  x1: number
  x2: number
}

export interface TessClassification {
  subjectId: string
  verdict: TessVerdict
  ranges: TransitRange[]
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

function seededNoise(seed: number, index: number): number {
  let h = seed ^ Math.imul(index + 1, 0x9e3779b9)
  h ^= h >>> 16
  h = Math.imul(h, 0x7feb352d)
  h ^= h >>> 15
  h = Math.imul(h, 0x846ca68b)
  h ^= h >>> 16
  return ((h >>> 0) / 0xffffffff) - 0.5
}

// Real backend candidates carry one fixed continuous `lightcurvePoints`
// array (real observational data — we can only window it, never invent more
// samples). The synthetic fallback below is cheap to generate, though, so
// give it enough total density that windowing into up to ~8 real sectors
// still leaves each sector looking like an actual lightcurve (not 40-odd
// sparse dots) — was 220 total, i.e. ~44/sector once split 5 ways.
const SYNTHETIC_POINT_COUNT = 1100

export function tessLightcurvePoints(candidate: TessCandidate): LightcurvePoint[] {
  if (candidate.lightcurvePoints?.length) return candidate.lightcurvePoints

  const seed = hashId(candidate.id)
  const points: LightcurvePoint[] = []
  const spanDays = 27.4
  const depth = candidate.depthPpm / 1_000_000
  const transitWidth = Math.max(0.045, Math.min(0.16, candidate.periodDays * 0.018))

  for (let i = 0; i < SYNTHETIC_POINT_COUNT; i += 1) {
    const x = (i / (SYNTHETIC_POINT_COUNT - 1)) * spanDays
    const phase = ((x - candidate.transitEpoch) % candidate.periodDays + candidate.periodDays) % candidate.periodDays
    const distance = Math.min(phase, candidate.periodDays - phase)
    const dip = depth * Math.exp(-0.5 * (distance / transitWidth) ** 2)
    const trend = Math.sin((x / spanDays) * Math.PI * 2 + (seed % 31)) * 0.00018
    const noise = seededNoise(seed, i) * 0.00046
    points.push({
      x: Math.round(x * 1000) / 1000,
      y: Math.round((1 - dip + trend + noise) * 100000) / 100000,
    })
  }

  return points
}

export function nextUnclassifiedTessCandidate(candidates: TessCandidate[], classifications: Record<string, TessClassification> = {}): TessCandidate | null {
  return candidates.find(candidate => !classifications[candidate.id]) ?? candidates[0] ?? null
}

// `preferredId` is the player's satellite-pointing choice (see
// Player.satelliteTargetId) — if it's still in the reviewable pool, honour
// it over the deterministic daily hash pick.
export function dailyTessCandidates(candidates: TessCandidate[], dateKey: string, _stationLevel = 1, preferredId?: string | null): TessCandidate[] {
  if (candidates.length === 0) return []
  if (preferredId) {
    const preferred = candidates.find(candidate => candidate.id === preferredId)
    if (preferred) return [preferred]
  }
  const start = hashId(dateKey) % candidates.length
  return [candidates[start]]
}

// ── Real sectors from the data source ────────────────────────────────────
// TessCandidate.sector is a free-text field populated from the shared
// backend's real TESS ingestion (see backend/migrations/7_subjects_pipeline.go
// — "Stores real TESS TCE lightcurve subjects fetched from NASA Exoplanet
// Archive"). There is no per-sector-segmented flux array in that schema —
// `lightcurve_points` is one continuous curve — so "switching sectors"
// means windowing the one curve we have, but the *sector numbers* shown
// are real, parsed from this field, not invented.
export function parseSectorList(sectorText: string): string[] {
  const text = (sectorText ?? '').trim()
  if (!text) return []

  // Range form: "Sectors 1-5" / "Sector 14-16"
  const rangeMatch = text.match(/(\d+)\s*-\s*(\d+)/)
  if (rangeMatch) {
    const from = Number(rangeMatch[1]), to = Number(rangeMatch[2])
    if (Number.isFinite(from) && Number.isFinite(to) && to >= from && to - from < 40) {
      const list: string[] = []
      for (let n = from; n <= to; n += 1) list.push(String(n))
      return list
    }
  }

  // List form: "14,15,16" / "Sector 7, Sector 9"
  const numbers = text.match(/\d+/g)
  if (numbers && numbers.length > 0) return Array.from(new Set(numbers))

  return []
}

export interface SectorWindow {
  label: string
  points: LightcurvePoint[]
}

// Splits one continuous lightcurve into N contiguous, equal-width windows
// (one per real sector). Falls back to a single window covering the whole
// curve when the sector text can't be parsed into 2+ sectors.
export function sectorWindows(points: LightcurvePoint[], sectorText: string): SectorWindow[] {
  const sectors = parseSectorList(sectorText)
  if (sectors.length < 2 || points.length < sectors.length * 2) {
    return [{ label: sectors[0] ? `SECTOR ${sectors[0]}` : 'FULL RANGE', points }]
  }
  const chunkSize = Math.floor(points.length / sectors.length)
  return sectors.map((label, index) => {
    const start = index * chunkSize
    const end = index === sectors.length - 1 ? points.length : start + chunkSize
    return { label: `SECTOR ${label}`, points: points.slice(start, end) }
  })
}

// ── Synthetic sky position (for the satellite-pointing map) ─────────────
// The shared backend's subjects schema has no RA/Dec (or any spatial)
// field — see backend/migrations/7_subjects_pipeline.go — so positions are
// deterministic pseudo-random per candidate id, stable across renders/days,
// not read from any real astrometry. Swap this out if/when real coordinates
// land in the schema.
export function candidateSkyPosition(candidate: TessCandidate): { x: number; y: number } {
  const seed = hashId(candidate.id)
  const rx = ((seed & 0xffff) / 0xffff) * 2 - 1
  const ry = (((seed >>> 16) & 0xffff) / 0xffff) * 2 - 1
  return { x: rx, y: ry }
}

// Sun's effective temperature (K) — fallback host for candidates whose
// subject row predates the st_teff field, and the reference point "hot" vs
// "cool" spectral classification is measured against below.
export const SUN_TEFF_K = 5772

// Real, standard main-sequence spectral boundaries (Teff in Kelvin) — see
// e.g. Habets & Heintze (1981) or any modern stellar-classification table.
export function spectralClassForTeff(teffK: number): 'M' | 'K' | 'G' | 'F' | 'A' | 'B' | 'O' {
  if (teffK < 3700) return 'M'
  if (teffK < 5200) return 'K'
  if (teffK < 6000) return 'G'
  if (teffK < 7500) return 'F'
  if (teffK < 10000) return 'A'
  if (teffK < 30000) return 'B'
  return 'O'
}

// Maps a confirmed discovery's player-measured orbital period and host
// star temperature onto the same C/S/M/icy/gas-giant taxonomy every other
// Landnam target uses (target-archetypes.ts) — grounded the same way that
// file's archetypes are:
// - Short-period worlds around hotter (F/A/B/O) stars: real close-in
//   planets around hot stars face intense irradiation that strips lighter
//   material, plausibly exposing metal-rich interiors (mirrors the
//   16 Psyche-style "exposed core" reasoning already used for M-type).
// - Short-period worlds around cooler (G/K/M) stars: less stripping,
//   plausibly carbonaceous/volatile-rich (mirrors C-type reasoning).
// - Long-period worlds: colder equilibrium temperature regardless of host,
//   consistent with icy/gas-giant compositions already documented as
//   "no metals expected at any tier."
// Boundaries are round-number heuristics, not a physical model — same
// "estimate, not lab-grade astrophysics" disclaimer as deriveObservatoryStats.
const CLOSE_ORBIT_PERIOD_DAYS = 10
const LONG_ORBIT_PERIOD_DAYS = 200

export function archetypeForDiscovery(periodDays: number, starTeffK: number): TargetArchetype {
  const hotHost = starTeffK >= 6000 // F/A/B/O
  if (periodDays <= CLOSE_ORBIT_PERIOD_DAYS) return hotHost ? 'M' : 'C'
  if (periodDays >= LONG_ORBIT_PERIOD_DAYS) return hotHost ? 'gas-giant' : 'icy'
  return hotHost ? 'S' : 'icy'
}

export function tessCandidateToExoplanetTarget(candidate: TessCandidate, measuredPeriodDays?: number | null): import('./types').Target {
  const safeId = candidate.id.replace(/[^a-zA-Z0-9_-]/g, '-').toLowerCase()
  const periodDays = measuredPeriodDays ?? candidate.periodDays
  const starTeffK = candidate.starTeffK ?? SUN_TEFF_K
  const archetype = archetypeForDiscovery(periodDays, starTeffK)
  const orbit = 5
  return {
    id: `exo-${safeId}`,
    name: candidate.toi,
    type: 'exoplanet',
    orbit,
    difficulty: candidate.signalToNoise >= 15 ? 'L2' : 'L3',
    brief: `${candidate.host} candidate in ${candidate.constellation}. Added from satellite lightcurve review; plot in the star map, not the solar system.`,
    minerals: mineralsForArchetype(archetype, orbit),
    archetype,
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function isReviewableTessSubject(record: any): boolean {
  const subjectType = String(record.subject_type ?? '').toLowerCase()
  if (subjectType !== 'transit') return false

  const goldLabel = String(record.gold_label ?? '').toLowerCase()
  if (goldLabel === 'planet' || goldLabel === 'not_planet') return false

  const consensus = String(record.consensus ?? '').toLowerCase()
  if (consensus === 'planet' || consensus === 'not_planet') return false

  const disposition = String(record.tfopwg_disp ?? record.disposition ?? '').toUpperCase()
  if (disposition === 'KP' || disposition === 'CP' || disposition === 'FP') return false

  return true
}

function parseLightcurvePoints(value: unknown): LightcurvePoint[] | undefined {
  const raw = typeof value === 'string'
    ? (() => {
        try { return JSON.parse(value) as unknown } catch { return null }
      })()
    : value
  if (!Array.isArray(raw)) return undefined
  const points = raw
    .map(point => {
      if (!point || typeof point !== 'object') return null
      const x = Number((point as { x?: unknown }).x)
      const y = Number((point as { y?: unknown }).y)
      return Number.isFinite(x) && Number.isFinite(y) ? { x, y } : null
    })
    .filter((point): point is LightcurvePoint => !!point)
  return points.length > 0 ? points : undefined
}

// ── Derived physics readout ──────────────────────────────────────────────
// Mirrors Landnam.html's Observatory: period comes from the gaps between
// marked-range midpoints, depth comes from the marked ranges themselves
// (not the candidate's known value), and radius/temp/zone derive from
// those live measurements — so the readout genuinely responds to marks
// instead of just echoing precomputed candidate fields.

export interface ObservatoryStats {
  periodDays: number | null
  radiusEarth: number | null
  eqTempK: number | null
  zone: 'FROZEN' | 'HABITABLE' | 'WARM' | null
}

export function periodFromRanges(ranges: TransitRange[]): number | null {
  if (ranges.length < 2) return null
  const centres = ranges.map(r => (r.x1 + r.x2) / 2).sort((a, b) => a - b)
  const gaps = centres.slice(1).map((centre, index) => centre - centres[index])
  return gaps.reduce((sum, gap) => sum + gap, 0) / gaps.length
}

export function depthFromRanges(points: LightcurvePoint[], ranges: TransitRange[]): number | null {
  if (ranges.length === 0 || points.length === 0) return null
  const depths = ranges
    .map(range => {
      const lo = Math.min(range.x1, range.x2), hi = Math.max(range.x1, range.x2)
      const within = points.filter(point => point.x >= lo && point.x <= hi)
      if (!within.length) return null
      return 1 - Math.min(...within.map(point => point.y))
    })
    .filter((depth): depth is number => depth !== null && depth > 0)
  if (!depths.length) return null
  return depths.reduce((sum, depth) => sum + depth, 0) / depths.length
}

export function deriveObservatoryStats(candidate: TessCandidate, points: LightcurvePoint[], ranges: TransitRange[]): ObservatoryStats {
  const periodDays = periodFromRanges(ranges)
  const depth = depthFromRanges(points, ranges)
  const knownDepth = candidate.depthPpm / 1_000_000
  const radiusEarth = depth != null && knownDepth > 0
    ? candidate.planetRadiusEarth * Math.sqrt(depth / knownDepth)
    : null

  let eqTempK: number | null = null
  let zone: ObservatoryStats['zone'] = null
  if (periodDays != null) {
    // Semi-major axis assuming a solar-mass host (Kepler's third law);
    // equilibrium temp assuming a solar-type host — presented as an
    // estimate, not lab-grade astrophysics.
    const semiMajorAxisAu = Math.pow(periodDays / 365.25, 2 / 3)
    eqTempK = 255 / Math.sqrt(2 * semiMajorAxisAu)
    zone = eqTempK < 200 ? 'FROZEN' : eqTempK <= 320 ? 'HABITABLE' : 'WARM'
  }

  return { periodDays, radiusEarth, eqTempK, zone }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function toTessCandidate(record: any): TessCandidate {
  const toi = String(record.toi_id ?? record.toi ?? record.id ?? 'candidate')
  const ticId = String(record.tic_id ?? record.tid ?? record.id ?? 'TIC')
  const periodDays = Number(record.period_days ?? record.pl_orbper ?? 3)
  const depthPct = Number(record.depth_pct ?? 0.1)
  const depthPpm = Number(record.depth_ppm ?? record.pl_trandep ?? depthPct * 10000)
  const starTeffK = Number(record.st_teff)

  return {
    id: String(record.id ?? `${ticId}-${toi}`),
    ticId: ticId.startsWith('TIC') ? ticId : `TIC ${ticId}`,
    toi: toi.startsWith('TOI') ? toi : `TOI ${toi}`,
    host: toi.startsWith('TOI') ? toi.replace(/\.\d+$/, '') : `TOI-${toi}`,
    sector: String(record.sectors ?? record.sector ?? 'TESS sector'),
    constellation: String(record.constellation ?? 'TESS field'),
    distanceLy: Number(record.distance_ly ?? 0),
    planetRadiusEarth: Number(record.planet_radius_earth ?? 0),
    periodDays: Number.isFinite(periodDays) && periodDays > 0 ? periodDays : 3,
    transitEpoch: Number(record.transit_epoch ?? 0.7),
    depthPpm: Number.isFinite(depthPpm) && depthPpm > 0 ? depthPpm : 1000,
    signalToNoise: Number(record.signal_to_noise ?? record.snr ?? 0),
    lightcurvePoints: parseLightcurvePoints(record.lightcurve_points),
    starTeffK: Number.isFinite(starTeffK) && starTeffK > 0 ? starTeffK : undefined,
  }
}
