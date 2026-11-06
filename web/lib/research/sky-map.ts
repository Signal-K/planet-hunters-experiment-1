/**
 * The whole sky as the telescopes see it (SSL-788). A pointing is a real position: right ascension 0 to 360
 * degrees (wrapping) and declination -90 to +90. The sky is cut into equal fields; every lock marks the field it
 * lands in, and a player's mapped fields accumulate across weeks until the whole sky is covered.
 */

export const FIELD_DEG = 15
export const RA_FIELDS = 360 / FIELD_DEG
export const DEC_FIELDS = 180 / FIELD_DEG
export const TOTAL_FIELDS = RA_FIELDS * DEC_FIELDS

export interface SkyAim { ra: number; dec: number }
export type SkyInstrument = 'transit' | 'deep-space' | 'saturn'

/** A field that has been mapped: the week it was first locked and the instrument that did it. */
export interface MappedField { week: string; instrument: SkyInstrument }
export type SkyMap = Record<string, MappedField>

export const wrapRa = (ra: number): number => ((ra % 360) + 360) % 360
export const clampDec = (dec: number): number => Math.max(-90, Math.min(90, dec))

/** Shortest signed RA difference a - b in degrees, in -180..180. */
export function raDelta(a: number, b: number): number {
  return ((a - b + 540) % 360) - 180
}

/** The field a position falls in, as a stable id: `<raIndex>_<decIndex>`. */
export function fieldId(aim: SkyAim): string {
  const ra = Math.min(RA_FIELDS - 1, Math.floor(wrapRa(aim.ra) / FIELD_DEG))
  const dec = Math.min(DEC_FIELDS - 1, Math.floor((clampDec(aim.dec) + 90) / FIELD_DEG))
  return `${ra}_${dec}`
}

/** The centre of a field id, or null for an id that is not a field. */
export function fieldCentre(id: string): SkyAim | null {
  const [r, d] = id.split('_').map(Number)
  if (!Number.isInteger(r) || !Number.isInteger(d) || r < 0 || r >= RA_FIELDS || d < 0 || d >= DEC_FIELDS) return null
  return { ra: r * FIELD_DEG + FIELD_DEG / 2, dec: d * FIELD_DEG - 90 + FIELD_DEG / 2 }
}

export function mappedCount(map: SkyMap | undefined): number {
  return Object.keys(map ?? {}).filter(id => fieldCentre(id)).length
}

export function mappedPercent(map: SkyMap | undefined): number {
  return (mappedCount(map) / TOTAL_FIELDS) * 100
}

/** Record a lock. A field already mapped keeps its first record. */
export function markMapped(map: SkyMap | undefined, aim: SkyAim, week: string, instrument: SkyInstrument): SkyMap {
  const id = fieldId(aim)
  if (map?.[id]) return map
  return { ...(map ?? {}), [id]: { week, instrument } }
}

/** Fields mapped on either side of a sync: the earlier week wins for a field both have. */
export function mergeSkyMaps(local: SkyMap | undefined, remote: SkyMap | undefined): SkyMap | undefined {
  if (!local && !remote) return undefined
  const out: SkyMap = { ...(remote ?? {}) }
  for (const [id, field] of Object.entries(local ?? {})) {
    const other = out[id]
    if (!other || field.week < other.week) out[id] = field
  }
  return out
}

export function formatRa(ra: number): string {
  const hours = wrapRa(ra) / 15
  const h = Math.floor(hours)
  const m = Math.floor((hours - h) * 60)
  return `${String(h).padStart(2, '0')}h ${String(m).padStart(2, '0')}m`
}

export function formatDec(dec: number): string {
  const d = Math.round(clampDec(dec))
  return `${d < 0 ? '−' : '+'}${Math.abs(d)}°`
}

export function formatAim(aim: SkyAim): string {
  return `RA ${formatRa(aim.ra)} · DEC ${formatDec(aim.dec)}`
}

/** Galactic latitude in degrees (the north galactic pole is at RA 192.86, Dec +27.13). */
export function galacticLatitude(aim: SkyAim): number {
  const r = (aim.ra * Math.PI) / 180
  const d = (aim.dec * Math.PI) / 180
  const pr = (192.85948 * Math.PI) / 180
  const pd = (27.12825 * Math.PI) / 180
  const s = Math.sin(d) * Math.sin(pd) + Math.cos(d) * Math.cos(pd) * Math.cos(r - pr)
  return (Math.asin(Math.max(-1, Math.min(1, s))) * 180) / Math.PI
}

/** Named places to steer by. They are landmarks on the chart; any other point can be locked too. */
export interface Landmark { id: string; name: string; note: string; ra: number; dec: number }
export const LANDMARKS: Landmark[] = [
  { id: 'cygnus', name: 'Cygnus field', note: 'A dense patch of stars. Many will have planets.', ra: 291, dec: 44 },
  { id: 'plane', name: 'Galactic plane', note: 'The Milky Way crowds the frame with stars.', ra: 271.25, dec: -20 },
  { id: 'southern', name: 'Southern field', note: 'A quiet field of bright, nearby stars.', ra: 92.5, dec: -64 },
  { id: 'orion', name: 'Orion', note: 'The hunter: bright stars and a stellar nursery.', ra: 83.8, dec: -5.4 },
  { id: 'pleiades', name: 'Pleiades', note: 'A young open cluster of blue stars.', ra: 56.9, dec: 24.1 },
  { id: 'andromeda', name: 'Andromeda', note: 'Our neighbouring galaxy, two and a half million light years away.', ra: 10.7, dec: 41.3 },
  { id: 'lmc', name: 'Large Magellanic Cloud', note: 'A small galaxy orbiting ours.', ra: 80.9, dec: -69.8 },
  { id: 'polaris', name: 'North celestial pole', note: 'The sky turns around this point.', ra: 37.95, dec: 89.3 },
  { id: 'centre', name: 'Galactic centre', note: 'Towards the middle of the Milky Way.', ra: 266.4, dec: -29 },
  { id: 'virgo', name: 'Virgo cluster', note: 'A crowd of galaxies.', ra: 187.7, dec: 12.4 },
]

/** The landmark within `within` degrees of an aim, nearest first, or null. */
export function landmarkNear(aim: SkyAim, within = 8): Landmark | null {
  let best: Landmark | null = null
  let bestD = within
  for (const l of LANDMARKS) {
    const d = Math.hypot(raDelta(l.ra, aim.ra) * Math.cos((aim.dec * Math.PI) / 180), l.dec - aim.dec)
    if (d <= bestD) { best = l; bestD = d }
  }
  return best
}
