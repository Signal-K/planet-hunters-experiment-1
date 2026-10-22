import type { PlayerLocation } from '@/lib/game-types'

export interface SkyEventEphemeris {
  radiantRightAscensionDeg: number
  radiantDeclinationDeg: number
  peakUtc: string
}

export interface ViewingWindow {
  startMs: number
  endMs: number
}

export interface LocalSkyEventWindow {
  location: PlayerLocation
  viewing: ViewingWindow | null
  moonFree: ViewingWindow | null
  best: ViewingWindow | null
}

export const ORIONIDS_EPHEMERIS: SkyEventEphemeris = {
  radiantRightAscensionDeg: 95,
  radiantDeclinationDeg: 16,
  peakUtc: '2026-10-22T00:00:00Z',
}

export const SKY_EVENT_CITIES: ReadonlyArray<PlayerLocation> = [
  { city: 'Tallinn', latitude: 59, timeZone: 'Europe/Tallinn' },
  { city: 'London', latitude: 52, timeZone: 'Europe/London' },
  { city: 'New York', latitude: 41, timeZone: 'America/New_York' },
  { city: 'Tokyo', latitude: 36, timeZone: 'Asia/Tokyo' },
  { city: 'Sydney', latitude: -34, timeZone: 'Australia/Sydney' },
] as const

export function sanitizePlayerLocation(raw: unknown): PlayerLocation | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  const value = raw as Partial<PlayerLocation>
  if (typeof value.latitude !== 'number' || !Number.isFinite(value.latitude)) return null
  if (typeof value.timeZone !== 'string' || !validTimeZone(value.timeZone)) return null
  return {
    ...(typeof value.city === 'string' && value.city.trim() ? { city: value.city.trim().slice(0, 60) } : {}),
    latitude: Math.max(-90, Math.min(90, Math.round(value.latitude))),
    timeZone: value.timeZone,
  }
}

export function deviceSkyLocation(): PlayerLocation {
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
  return { latitude: 0, timeZone }
}

export function localSkyEventWindow(
  event: SkyEventEphemeris,
  stored: PlayerLocation | null | undefined,
): LocalSkyEventWindow {
  const location = sanitizePlayerLocation(stored) ?? deviceSkyLocation()
  const peak = localParts(Date.parse(event.peakUtc), location.timeZone)
  const endDay = peak.day + (peak.hour >= 12 ? 1 : 0)
  const start = zonedTimeToUtc(peak.year, peak.month, endDay - 1, 12, location.timeZone)
  const end = zonedTimeToUtc(peak.year, peak.month, endDay, 12, location.timeZone)
  const viewingSegments = scanSegments(start, end, ms => {
    const jd = ms / 86_400_000 + 2440587.5
    return sunAltitude(jd, location.latitude) <= -18
      && fixedAltitude(jd, location.latitude, event.radiantRightAscensionDeg, event.radiantDeclinationDeg) > 0
  })
  const moonSegments = scanSegments(start, end, ms => {
    const jd = ms / 86_400_000 + 2440587.5
    return sunAltitude(jd, location.latitude) <= -18
      && fixedAltitude(jd, location.latitude, event.radiantRightAscensionDeg, event.radiantDeclinationDeg) > 0
      && moonAltitude(jd, location.latitude) < 0
  })
  const viewing = longest(viewingSegments)
  const moonFree = longest(moonSegments)
  return { location, viewing, moonFree, best: moonFree ?? viewing }
}

export function isInLocalEventBonusWindow(at: Date | number, location?: PlayerLocation | null): boolean {
  const window = localSkyEventWindow(ORIONIDS_EPHEMERIS, location).best
  const ms = at instanceof Date ? at.getTime() : at
  return !!window && ms >= window.startMs && ms < window.endMs
}

export function formatViewingWindow(window: ViewingWindow | null, timeZone: string): string {
  if (!window) return 'No dark viewing window'
  const format = new Intl.DateTimeFormat(undefined, { timeZone, hour: '2-digit', minute: '2-digit', hour12: false })
  return `${format.format(window.startMs)}–${format.format(window.endMs)}`
}

function validTimeZone(value: string): boolean {
  try { new Intl.DateTimeFormat('en', { timeZone: value }).format(0); return true } catch { return false }
}

function localParts(ms: number, timeZone: string) {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', hourCycle: 'h23' }).formatToParts(ms)
  const read = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find(part => part.type === type)?.value)
  return { year: read('year'), month: read('month'), day: read('day'), hour: read('hour') }
}

function zonedTimeToUtc(year: number, month: number, day: number, hour: number, timeZone: string): number {
  const wanted = Date.UTC(year, month - 1, day, hour)
  let guess = wanted
  for (let i = 0; i < 3; i += 1) {
    const parts = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', hourCycle: 'h23' }).formatToParts(guess)
    const read = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find(part => part.type === type)?.value)
    const represented = Date.UTC(read('year'), read('month') - 1, read('day'), read('hour'))
    guess += wanted - represented
  }
  return guess
}

function scanSegments(start: number, end: number, predicate: (ms: number) => boolean): ViewingWindow[] {
  const step = 5 * 60_000
  const segments: ViewingWindow[] = []
  let open: number | null = null
  for (let ms = start; ms <= end; ms += step) {
    if (predicate(ms)) open ??= ms
    else if (open != null) { segments.push({ startMs: open, endMs: ms }); open = null }
  }
  if (open != null) segments.push({ startMs: open, endMs: end })
  return segments
}

function longest(windows: ViewingWindow[]): ViewingWindow | null {
  return windows.reduce<ViewingWindow | null>((best, item) => !best || item.endMs - item.startMs > best.endMs - best.startMs ? item : best, null)
}

const rad = Math.PI / 180
const norm = (degrees: number) => ((degrees % 360) + 360) % 360

function siderealDegrees(jd: number): number { return norm(280.46061837 + 360.98564736629 * (jd - 2451545)) }
function altitude(latitude: number, declination: number, hourAngle: number): number {
  return Math.asin(Math.sin(latitude * rad) * Math.sin(declination * rad) + Math.cos(latitude * rad) * Math.cos(declination * rad) * Math.cos(hourAngle * rad)) / rad
}
function fixedAltitude(jd: number, latitude: number, ra: number, dec: number): number { return altitude(latitude, dec, norm(siderealDegrees(jd) - ra + 180) - 180) }

function sunEquatorial(jd: number): { ra: number; dec: number } {
  const n = jd - 2451545
  const longitude = norm(280.46 + 0.9856474 * n + 1.915 * Math.sin((357.528 + 0.9856003 * n) * rad))
  const obliquity = (23.439 - 0.0000004 * n) * rad
  return { ra: norm(Math.atan2(Math.cos(obliquity) * Math.sin(longitude * rad), Math.cos(longitude * rad)) / rad), dec: Math.asin(Math.sin(obliquity) * Math.sin(longitude * rad)) / rad }
}
function sunAltitude(jd: number, latitude: number): number { const sun = sunEquatorial(jd); return fixedAltitude(jd, latitude, sun.ra, sun.dec) }

// Low-precision lunar position is ample for a five-minute rise/set boundary.
function moonAltitude(jd: number, latitude: number): number {
  const d = jd - 2451543.5
  const node = norm(125.1228 - 0.0529538083 * d) * rad
  const inclination = 5.1454 * rad
  const periapsis = norm(318.0634 + 0.1643573223 * d) * rad
  const eccentricity = 0.0549
  const meanAnomaly = norm(115.3654 + 13.0649929509 * d) * rad
  const eccentricAnomaly = meanAnomaly + eccentricity * Math.sin(meanAnomaly) * (1 + eccentricity * Math.cos(meanAnomaly))
  const x = Math.cos(eccentricAnomaly) - eccentricity
  const y = Math.sqrt(1 - eccentricity * eccentricity) * Math.sin(eccentricAnomaly)
  const distance = Math.sqrt(x * x + y * y)
  const anomaly = Math.atan2(y, x)
  const xe = distance * (Math.cos(node) * Math.cos(anomaly + periapsis) - Math.sin(node) * Math.sin(anomaly + periapsis) * Math.cos(inclination))
  const ye = distance * (Math.sin(node) * Math.cos(anomaly + periapsis) + Math.cos(node) * Math.sin(anomaly + periapsis) * Math.cos(inclination))
  const ze = distance * Math.sin(anomaly + periapsis) * Math.sin(inclination)
  const eclipticLongitude = Math.atan2(ye, xe)
  const eclipticLatitude = Math.atan2(ze, Math.sqrt(xe * xe + ye * ye))
  const obliquity = (23.4393 - 3.563e-7 * d) * rad
  const eqX = Math.cos(eclipticLongitude) * Math.cos(eclipticLatitude)
  const eqY = Math.sin(eclipticLongitude) * Math.cos(eclipticLatitude) * Math.cos(obliquity) - Math.sin(eclipticLatitude) * Math.sin(obliquity)
  const eqZ = Math.sin(eclipticLongitude) * Math.cos(eclipticLatitude) * Math.sin(obliquity) + Math.sin(eclipticLatitude) * Math.cos(obliquity)
  return fixedAltitude(jd, latitude, norm(Math.atan2(eqY, eqX) / rad), Math.asin(eqZ) / rad)
}
