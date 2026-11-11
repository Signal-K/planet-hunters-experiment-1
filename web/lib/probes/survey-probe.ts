// Survey probes (SSL-773). A probe is flown to a planet or asteroid and left in orbit; it does not come home
// (Liam, 9 Nov). It sends reflectance readings of the body's surface, one sector at a time, to the data hub.
// The player reads each spectrum and marks the deposits they see in it; logging the reading is a probe
// observation: a research stamp, a ledger row, and the sector's deposits marked on the body's map.
// Pure over the player, like the other systems.

import type { Mission, Target } from '@/lib/data/types'
import type { Player } from '@/lib/game-types'
import { addStamp } from '@/lib/research/stamps'

export const SURVEY_PROBE_INSTRUMENT_ID = 'survey-probe'
/** Sectors across and down a body's map. */
export const PROBE_COLS = 6
export const PROBE_ROWS = 4
/** Readings a probe sends per UTC day. A launched probe is a daily feed, like the telescopes. */
export const PROBE_READINGS_PER_DAY = 3
/** Probe launch missions offered at once: the nearest bodies without one. */
const PROBE_OFFERS = 2
/** Spectrum span in nanometres: visible to short-wave infrared, as on a real reflectance spectrometer. */
export const BAND_MIN_NM = 400
export const BAND_MAX_NM = 2500

export interface ProbeReading {
  at: number
  /** What the player marked in the spectrum. */
  marked: string[]
  /** What was really there, so the map and the readout can show it. */
  deposits: string[]
}

export interface ProbeRecord {
  launchedAt: number
  /** Logged readings, keyed by sector id (`c_r`). */
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
    brief: `Fly a survey probe to ${target.name} and leave it in orbit. It stays there and sends ${PROBE_READINGS_PER_DAY} surface readings a day to your data hub, so you can find where the deposits are.`,
    tag: 'STORY',
    difficulty: target.difficulty,
    locked: false,
    sequence,
    unlockAt: 'Build the control station',
    targetId: target.id,
    payload: { type: 'satellite', name: 'Survey probe', cargoCost: 0, instrumentId: SURVEY_PROBE_INSTRUMENT_ID },
    requires: { minerals: {}, cargo_min: 0, drill_tier: 1, max_orbit: target.orbit },
    programReward: { researchXP: 0, outcome: `Probe in orbit at ${target.name} · surface readings in the data hub` },
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

const dayKey = (at: number) => new Date(at).toISOString().slice(0, 10)

/** Readings logged today across one probe. */
export function readingsToday(record: ProbeRecord | undefined, now: number): number {
  const today = dayKey(now)
  return Object.values(record?.readings ?? {}).filter(reading => dayKey(reading.at) === today).length
}

/** Readings still waiting today: the probe's daily downlink, less what is logged, and never more than unread sectors. */
export function readingsLeft(record: ProbeRecord | undefined, now: number): number {
  if (!record) return 0
  const unread = sectorIds().filter(id => !record.readings[id]).length
  return Math.max(0, Math.min(unread, PROBE_READINGS_PER_DAY - readingsToday(record, now)))
}

/** Readings waiting across every probe. */
export function probeReadingsLeft(player: Pick<Player, 'probes'>, now: number): number {
  return Object.values(player.probes ?? {}).reduce((sum, record) => sum + readingsLeft(record, now), 0)
}

/** How a marked reading compares with what is there. */
export function readingScore(marked: readonly string[], deposits: readonly string[]): { found: number; missed: number; wrong: number } {
  const there = new Set(deposits)
  const found = marked.filter(mineral => there.has(mineral)).length
  return { found, missed: deposits.length - found, wrong: marked.length - found }
}

/**
 * Log one reading: the sector's deposits go on the map and the day gets a probe-observation stamp (one per day,
 * like every stamp). Returns the same player when the sector is already read or today's downlink is used up.
 */
export function logProbeReading<T extends ProbePlayer>(player: T, target: Pick<Target, 'id' | 'minerals'>, sectorId: string, marked: readonly string[], at: number): T {
  const record = player.probes?.[target.id]
  if (!record || record.readings[sectorId] || readingsLeft(record, at) <= 0 || !sectorIds().includes(sectorId)) return player
  const reading: ProbeReading = { at, marked: target.minerals.filter(mineral => marked.includes(mineral)), deposits: sectorDeposits(target, sectorId) }
  const next = { ...player, probes: { ...(player.probes ?? {}), [target.id]: { ...record, readings: { ...record.readings, [sectorId]: reading } } } }
  return addStamp(next, 'probe-observation', at)
}

/** Deposits found so far on a body, in the body's mineral order. */
export function depositsFound(record: ProbeRecord | undefined, target: Pick<Target, 'minerals'>): string[] {
  const seen = new Set(Object.values(record?.readings ?? {}).flatMap(reading => reading.deposits))
  return target.minerals.filter(mineral => seen.has(mineral))
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
