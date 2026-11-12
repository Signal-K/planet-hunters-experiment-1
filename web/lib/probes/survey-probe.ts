// Survey probes (SSL-773). A probe is flown to a planet or asteroid and left in orbit; it does not come home
// (Liam, 9 Nov). The basic scan is automatic (Liam, 12 Nov): the probe maps one sector of the body every
// PROBE_SECTOR_HOURS on its own, finding each deposit and how many tonnes it holds. It just takes time.
// Opening the probe console downloads the newly mapped sectors; that download is a probe observation (a research
// stamp, once a day, and a ledger row). Scan levels where the player does an activity come in cycle 11; the
// spectrum below is kept for them. Pure over the player, like the other systems.

import type { Mission, Target } from '@/lib/data/types'
import type { Player } from '@/lib/game-types'
import { addStamp } from '@/lib/research/stamps'

export const SURVEY_PROBE_INSTRUMENT_ID = 'survey-probe'
/** Sectors across and down a body's map. */
export const PROBE_COLS = 6
export const PROBE_ROWS = 4
/** Hours the probe takes to map one sector. 24 sectors: the whole body in two days. */
export const PROBE_SECTOR_HOURS = 2
const SECTOR_MS = PROBE_SECTOR_HOURS * 3_600_000
/** Probe launch missions offered at once: the nearest bodies without one. */
const PROBE_OFFERS = 2
/** Spectrum span in nanometres: visible to short-wave infrared, as on a real reflectance spectrometer. */
export const BAND_MIN_NM = 400
export const BAND_MAX_NM = 2500

export interface ProbeReading {
  /** When the player's console downloaded this sector. */
  at: number
  /** Unused by the basic scan; cycle 11's scan levels record what the player marked. */
  marked: string[]
  /** What the sector holds. */
  deposits: string[]
}

export interface ProbeRecord {
  launchedAt: number
  /** Sectors downloaded to the console, keyed by sector id (`c_r`). */
  readings: Record<string, ProbeReading>
}

export type ProbePlayer = Pick<Player, 'probes' | 'researchStamps'>

export const PROBE_MISSION_PREFIX = 'probe-launch-'

export function probeMissionId(targetId: string): string {
  return `${PROBE_MISSION_PREFIX}${targetId}`
}

export function probeTargetForMission(missionId: string | null | undefined): string | null {
  return missionId?.startsWith(PROBE_MISSION_PREFIX) ? missionId.slice(PROBE_MISSION_PREFIX.length) : null
}

/** Bodies a probe can survey: real planets and asteroids with minerals, not shower fields or exoplanets. */
export function probeableTargets(targets: readonly Target[]): Target[] {
  return targets.filter(target => (target.type === 'planet' || target.type === 'asteroid') && target.minerals.length > 0)
}

/** The bodies offered a probe now: the nearest ones (by orbit) that have none yet. */
export function probeOffers(targets: readonly Target[], player: Pick<Player, 'probes'>): Target[] {
  return probeableTargets(targets)
    .filter(target => !player.probes?.[target.id])
    .sort((a, b) => a.orbit - b.orbit || a.name.localeCompare(b.name))
    .slice(0, PROBE_OFFERS)
}

export function probeMission(target: Target, sequence: number): Mission {
  return {
    id: probeMissionId(target.id),
    title: `Survey probe to ${target.name}`,
    brief: `Fly a survey probe to ${target.name} and leave it in orbit. It stays there and maps the surface on its own, one sector every ${PROBE_SECTOR_HOURS} hours, and sends every deposit it finds to your data hub.`,
    tag: 'STORY',
    difficulty: target.difficulty,
    locked: false,
    sequence,
    unlockAt: 'Build the control station',
    targetId: target.id,
    payload: { type: 'satellite', name: 'Survey probe', cargoCost: 0, instrumentId: SURVEY_PROBE_INSTRUMENT_ID },
    requires: { minerals: {}, cargo_min: 0, drill_tier: 1, max_orbit: target.orbit },
    programReward: { researchXP: 0, outcome: `Probe in orbit at ${target.name} · mapping its deposits for the data hub` },
    payout: { francs: 0, affinity: 0 },
  }
}

/** The probe arrived: it is in orbit for good. Returns the same player when it already was. */
export function placeProbe<T extends Pick<Player, 'probes'>>(player: T, targetId: string, at: number): T {
  if (player.probes?.[targetId]) return player
  return { ...player, probes: { ...(player.probes ?? {}), [targetId]: { launchedAt: at, readings: {} } } }
}

export function probesInOrbit(player: Pick<Player, 'probes'>): string[] {
  return Object.keys(player.probes ?? {})
}

export function sectorIds(): string[] {
  const out: string[] = []
  for (let r = 0; r < PROBE_ROWS; r++) for (let c = 0; c < PROBE_COLS; c++) out.push(`${c}_${r}`)
  return out
}

function hash(text: string): number {
  let h = 2166136261
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619) >>> 0
  return h
}

function seeded(text: string) {
  let s = hash(text) || 1
  return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296 }
}

/**
 * What lies in one sector. Fixed per body and sector, so every reload and both devices agree. Most sectors
 * hold one or two of the body's minerals; a few are bare. Every mineral the body holds turns up somewhere.
 */
export function sectorDeposits(target: Pick<Target, 'id' | 'minerals'>, sectorId: string): string[] {
  const minerals = target.minerals
  if (!minerals.length) return []
  const ids = sectorIds()
  const index = ids.indexOf(sectorId)
  const r = seeded(`${target.id}:${sectorId}`)
  const roll = r()
  const out = new Set<string>()
  // Guarantee: mineral i sits in sector (i * 5 + offset) mod sectors, so none is missing from the map.
  const offset = hash(target.id) % ids.length
  minerals.forEach((mineral, i) => { if ((i * 5 + offset) % ids.length === index) out.add(mineral) })
  if (roll > 0.18) out.add(minerals[Math.floor(r() * minerals.length)])
  if (roll > 0.72 && minerals.length > 1) out.add(minerals[Math.floor(r() * minerals.length)])
  return minerals.filter(mineral => out.has(mineral))
}

/** Where a mineral's absorption band sits on the spectrum, in nm. Fixed per mineral, spread across the range. */
export function mineralBand(mineral: string): number {
  const span = BAND_MAX_NM - BAND_MIN_NM
  return Math.round(BAND_MIN_NM + 120 + ((hash(`band:${mineral}`) % 1000) / 1000) * (span - 240))
}

/** Bands for the body's minerals, nudged apart so no two overlap on screen. */
export function bodyBands(target: Pick<Target, 'minerals'>): Array<{ mineral: string; nm: number }> {
  const bands = target.minerals.map(mineral => ({ mineral, nm: mineralBand(mineral) })).sort((a, b) => a.nm - b.nm)
  for (let i = 1; i < bands.length; i++) if (bands[i].nm - bands[i - 1].nm < 110) bands[i] = { ...bands[i], nm: Math.min(BAND_MAX_NM - 60, bands[i - 1].nm + 110) }
  return bands
}

/**
 * The reflectance spectrum the probe sends for a sector: a gently sloping continuum with an absorption dip at
 * each deposit's band, plus instrument noise. `points` samples across BAND_MIN_NM..BAND_MAX_NM, values 0..1.
 */
export function sectorSpectrum(target: Pick<Target, 'id' | 'minerals'>, sectorId: string, points = 96): number[] {
  const deposits = new Set(sectorDeposits(target, sectorId))
  const bands = bodyBands(target).filter(band => deposits.has(band.mineral))
  const r = seeded(`spectrum:${target.id}:${sectorId}`)
  const tilt = 0.08 + r() * 0.1
  return Array.from({ length: points }, (_, i) => {
    const nm = BAND_MIN_NM + ((BAND_MAX_NM - BAND_MIN_NM) * i) / (points - 1)
    let v = 0.62 + tilt * ((nm - BAND_MIN_NM) / (BAND_MAX_NM - BAND_MIN_NM)) - 0.05
    for (const band of bands) v -= 0.3 * Math.exp(-(((nm - band.nm) / 55) ** 2))
    v += (r() - 0.5) * 0.035
    return Math.max(0.05, Math.min(0.98, v))
  })
}

/** How many tonnes of a mineral a sector holds. Fixed per body and sector; scarcer minerals come in smaller seams. */
const TONNES: Record<string, [number, number]> = { common: [400, 1400], uncommon: [150, 600], rare: [20, 140], exotic: [5, 45] }
export function depositTonnes(target: Pick<Target, 'id'>, sectorId: string, mineral: string, rarity = 'common'): number {
  const [lo, hi] = TONNES[rarity] ?? TONNES.common
  const r = seeded(`tonnes:${target.id}:${sectorId}:${mineral}`)
  const raw = lo + r() * (hi - lo)
  return Math.round(raw / (hi > 200 ? 10 : 1)) * (hi > 200 ? 10 : 1)
}

/** The order the probe maps sectors in: row by row, the way the orbit tracks across the body. */
export function scanOrder(): string[] {
  return sectorIds()
}

/** Sectors the probe has mapped by `now`: one every PROBE_SECTOR_HOURS since it arrived. */
export function sectorsMapped(record: Pick<ProbeRecord, 'launchedAt'> | undefined, now: number): string[] {
  if (!record) return []
  const count = Math.max(0, Math.min(sectorIds().length, Math.floor((now - record.launchedAt) / SECTOR_MS)))
  return scanOrder().slice(0, count)
}

/** The sector being mapped now and when it is done, or null once the whole body is mapped. */
export function nextSector(record: Pick<ProbeRecord, 'launchedAt'> | undefined, now: number): { sector: string; at: number } | null {
  if (!record) return null
  const done = sectorsMapped(record, now).length
  if (done >= sectorIds().length) return null
  return { sector: scanOrder()[done], at: record.launchedAt + (done + 1) * SECTOR_MS }
}

/** Mapped sectors not yet downloaded to the console. */
export function newSectors(record: ProbeRecord | undefined, now: number): string[] {
  return sectorsMapped(record, now).filter(id => !record?.readings[id])
}

/** New sectors waiting across every probe. */
export function probeSectorsWaiting(player: Pick<Player, 'probes'>, now: number): number {
  return Object.values(player.probes ?? {}).reduce((sum, record) => sum + newSectors(record, now).length, 0)
}

/**
 * Download every newly mapped sector of every probe: the sectors go into the save and the day gets a
 * probe-observation stamp (one per day, like every stamp). Returns the same player when nothing is new.
 */
export function collectProbeData<T extends ProbePlayer>(player: T, targets: readonly Pick<Target, 'id' | 'minerals'>[], at: number): T {
  let probes = player.probes
  let changed = false
  for (const [id, record] of Object.entries(player.probes ?? {})) {
    const target = targets.find(item => item.id === id)
    const fresh = newSectors(record, at)
    if (!target || !fresh.length) continue
    const readings = { ...record.readings }
    for (const sector of fresh) readings[sector] = { at, marked: [], deposits: sectorDeposits(target, sector) }
    probes = { ...(probes ?? {}), [id]: { ...record, readings } }
    changed = true
  }
  return changed ? addStamp({ ...player, probes }, 'probe-observation', at) : player
}

export interface SurveyTotal { mineral: string; tonnes: number; sectors: number }

/** What the probe has found on a body so far: each mineral, its tonnes and how many sectors hold it. */
export function bodySurvey(target: Pick<Target, 'id' | 'minerals'>, record: Pick<ProbeRecord, 'launchedAt'> | undefined, now: number, rarity: (mineral: string) => string | undefined = () => undefined): SurveyTotal[] {
  return surveyOf(target, sectorsMapped(record, now), rarity)
}

/** What has been downloaded to the console: the survey that clients and the free run are offered on. */
export function downloadedSurvey(target: Pick<Target, 'id' | 'minerals'>, record: Pick<ProbeRecord, 'readings'> | undefined, rarity: (mineral: string) => string | undefined = () => undefined): SurveyTotal[] {
  return surveyOf(target, Object.keys(record?.readings ?? {}), rarity)
}

/** Each mineral found in these sectors, its tonnes and how many sectors hold it, in the body's mineral order. */
export function surveyOf(target: Pick<Target, 'id' | 'minerals'>, sectors: readonly string[], rarity: (mineral: string) => string | undefined = () => undefined): SurveyTotal[] {
  const totals = new Map<string, SurveyTotal>()
  for (const sector of sectors) {
    for (const mineral of sectorDeposits(target, sector)) {
      const row = totals.get(mineral) ?? { mineral, tonnes: 0, sectors: 0 }
      row.tonnes += depositTonnes(target, sector, mineral, rarity(mineral))
      row.sectors += 1
      totals.set(mineral, row)
    }
  }
  return target.minerals.map(mineral => totals.get(mineral)).filter((row): row is SurveyTotal => !!row)
}

/** Merge two saves' probes: the earlier launch, every reading from both. */
export function mergeProbes(current: Player['probes'], remote: Player['probes']): Player['probes'] {
  const ids = new Set([...Object.keys(current ?? {}), ...Object.keys(remote ?? {})])
  if (ids.size === 0) return undefined
  return Object.fromEntries([...ids].map(id => {
    const a = current?.[id]
    const b = remote?.[id]
    if (!a || !b) return [id, (a ?? b)!]
    return [id, { launchedAt: Math.min(a.launchedAt, b.launchedAt), readings: { ...b.readings, ...a.readings } }]
  }))
}
