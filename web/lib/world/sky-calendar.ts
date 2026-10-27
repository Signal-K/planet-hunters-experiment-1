import calendar from './sky-events.json'
import { WorldRandom } from './rng'
import type { WorldTimeGrade } from '@/lib/scene/base-world'

/**
 * What is in the sky over the base right now (SSL-423). Real calendar entries (meteor showers, eclipses, Venus)
 * use real dates; satellites, launches elsewhere, balloons, weather, aurora and comets are deterministic per
 * local date from the shared salt, so every player sees the same sky at the same local time.
 * Native mirrors this in LandnamCore World/SkyCalendar.swift.
 */
export const SKY_EVENTS = calendar

export type SkyEventKind = 'meteors' | 'eclipse-solar' | 'eclipse-lunar' | 'planet' | 'satellite' | 'launch' | 'balloon' | 'aurora' | 'comet'
export type WeatherKind = 'clear' | 'cloudy' | 'windy' | 'rain' | 'storm' | 'fog'

export interface SkyEvent {
  id: string
  kind: SkyEventKind
  name: string
  /** Meteors per minute, for showers. */
  perMinute?: number
  /** Seconds since the event started, for timed passes and launches. */
  elapsed?: number
  /** Screen-fraction position for fixed sky objects (planets). */
  x?: number
  y?: number
}

export interface SkyWeather {
  kind: WeatherKind
  /** What falls when it rains: snow in the tundra. */
  precip: 'rain' | 'snow'
  /** Wind lifts dust off the desert. */
  dust: boolean
  /** Wind in kit units per second, positive blowing right. */
  wind: number
  clouds: number
  rainPerSecond: number
  boltEvery: number
}

export interface SkyState {
  events: SkyEvent[]
  weather: SkyWeather
}

const NIGHTISH: WorldTimeGrade[] = ['dusk', 'night', 'dawn']
const pad = (n: number) => String(n).padStart(2, '0')
const dateKey = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
const dayMs = 86_400_000

/** Days from `d` to month-day `md` (MM-DD) in the nearest year, signed. */
function daysToMonthDay(d: Date, md: string): number {
  const [m, day] = md.split('-').map(Number)
  let best = Infinity
  for (const y of [d.getFullYear() - 1, d.getFullYear(), d.getFullYear() + 1]) {
    const t = new Date(y, m - 1, day).getTime()
    const diff = (t - new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()) / dayMs
    if (Math.abs(diff) < Math.abs(best)) best = diff
  }
  return best
}

function inShowerWindow(d: Date, start: string, end: string): boolean {
  const toStart = daysToMonthDay(d, start)
  const toEnd = daysToMonthDay(d, end)
  return toStart <= 0 && toEnd >= 0 && (toEnd - toStart) <= 60
}

function pickWeather(d: Date, grade: WorldTimeGrade, biome: string): SkyWeather {
  const w = calendar.weather
  const land = (calendar.biomes as Record<string, { weather: Record<string, number>; precip?: string; dust?: boolean }>)[biome]
  const odds = land?.weather ?? {}
  const block = Math.floor(d.getHours() / w.blockHours)
  const rng = WorldRandom.from(`${calendar.salt}:weather:${dateKey(d)}:${block}`)
  const allowed = w.kinds.filter(k => !('onlyGrades' in k) || (k.onlyGrades as string[]).includes(grade))
  const weight = (k: { id: string; weight: number }) => k.weight * (odds[k.id] ?? 1)
  const total = allowed.reduce((sum, k) => sum + weight(k), 0)
  let roll = rng.next() * total
  let kind = allowed[0]
  for (const k of allowed) {
    roll -= weight(k)
    if (roll < 0) { kind = k; break }
  }
  const [lo, hi] = kind.wind
  const sign = rng.next() < 0.7 ? 1 : -1
  return landWeather({
    kind: kind.id as WeatherKind,
    wind: sign * rng.range(lo, hi),
    clouds: kind.clouds,
    rainPerSecond: 'rainPerSecond' in kind ? (kind.rainPerSecond as number) : 0,
    boltEvery: 'boltEvery' in kind ? (kind.boltEvery as number) : 0,
    precip: 'rain',
    dust: false,
  }, land)
}

/** Apply a landscape to weather: tundra precipitation is snow (no lightning in snow), desert wind over 6 raises dust. */
function landWeather(w: SkyWeather, land?: { precip?: string; dust?: boolean }): SkyWeather {
  const snow = land?.precip === 'snow'
  return { ...w, precip: snow ? 'snow' : 'rain', boltEvery: snow ? 0 : w.boltEvery, dust: !!land?.dust && Math.abs(w.wind) > 6 }
}

/**
 * The sky at a local time. `force` (dev, `?sky=`) adds events and weather by kind for previews; it never
 * changes what a real player sees.
 */
export function skyAt(now: Date, grade: WorldTimeGrade, biome: string, force: readonly string[] = []): SkyState {
  const events: SkyEvent[] = []
  const key = dateKey(now)
  const night = NIGHTISH.includes(grade)
  const secondsToday = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds()

  for (const shower of calendar.meteorShowers) {
    if (!inShowerWindow(now, shower.start, shower.end)) continue
    const fromPeak = Math.abs(daysToMonthDay(now, shower.peak))
    const perMinute = shower.perMinute * Math.exp(-fromPeak / shower.spreadDays)
    if (night && perMinute >= 0.5) events.push({ id: shower.id, kind: 'meteors', name: shower.name, perMinute })
  }
  for (const e of calendar.eclipses) {
    if (e.date !== key) continue
    if (e.kind === 'solar' && !night) events.push({ id: e.id, kind: 'eclipse-solar', name: e.name })
    if (e.kind === 'lunar' && grade === 'night') events.push({ id: e.id, kind: 'eclipse-lunar', name: e.name })
  }
  for (const p of calendar.planets) {
    if (key >= p.from && key <= p.to && (p.grades as string[]).includes(grade)) events.push({ id: p.id, kind: 'planet', name: p.name, x: p.x, y: p.y })
  }
  if ((calendar.satellites.grades as string[]).includes(grade)) {
    const rng = WorldRandom.from(`${calendar.salt}:satellites:${key}`)
    for (let i = 0; i < calendar.satellites.passesPerNight; i += 1) {
      // Passes fall in the evening (18:00 to 23:00) or before dawn (04:00 to 06:30).
      const start = rng.next() < 0.6 ? rng.range(18 * 3600, 23 * 3600) : rng.range(4 * 3600, 6.5 * 3600)
      const elapsed = secondsToday - start
      if (elapsed >= 0 && elapsed < calendar.satellites.seconds) events.push({ id: `satellite-${key}-${i}`, kind: 'satellite', name: 'Satellite pass', elapsed })
    }
  }
  {
    const l = calendar.launches
    const rng = WorldRandom.from(`${calendar.salt}:launch:${key}`)
    if (rng.next() < l.chancePerDay) {
      const start = rng.range(l.fromHour * 3600, l.toHour * 3600)
      const elapsed = secondsToday - start
      if (elapsed >= 0 && elapsed < l.seconds) events.push({ id: `launch-${key}`, kind: 'launch', name: l.name, elapsed })
    }
  }
  for (const hour of calendar.balloons.hours) {
    const elapsed = secondsToday - hour * 3600
    if (elapsed >= 0 && elapsed < calendar.balloons.seconds) events.push({ id: `balloon-${key}-${hour}`, kind: 'balloon', name: calendar.balloons.name, elapsed })
  }
  if ((calendar.aurora.grades as string[]).includes(grade)) {
    const chance = biome === 'tundra' ? calendar.aurora.tundraChancePerNight : calendar.aurora.chancePerNight
    // A night belongs to the evening it started on, so the aurora does not switch off at midnight.
    const evening = now.getHours() < 12 ? new Date(now.getTime() - dayMs) : now
    if (WorldRandom.from(`${calendar.salt}:aurora:${dateKey(evening)}`).next() < chance) events.push({ id: `aurora-${dateKey(evening)}`, kind: 'aurora', name: 'Aurora' })
  }
  if ((calendar.comets.grades as string[]).includes(grade)) {
    const c = calendar.comets
    const dayOfEpoch = Math.floor(new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime() / dayMs)
    const bucket = Math.floor(dayOfEpoch / c.bucketDays)
    const rng = WorldRandom.from(`${calendar.salt}:comet:${bucket}`)
    if (rng.next() < c.chancePerBucket) {
      const first = bucket * c.bucketDays + Math.floor(rng.range(0, c.bucketDays - c.days))
      if (dayOfEpoch >= first && dayOfEpoch < first + c.days) events.push({ id: `comet-${bucket}`, kind: 'comet', name: 'Comet' })
    }
  }

  let weather = pickWeather(now, grade, biome)
  for (const f of force) {
    // Preview showers need to be visibly alive without becoming a white wall
    // of trails. The real calendar controls live event intensity separately.
    if (f === 'meteors') events.push({ id: 'forced-meteors', kind: 'meteors', name: 'Meteor shower', perMinute: 8 })
    if (f === 'launch') events.push({ id: 'forced-launch', kind: 'launch', name: calendar.launches.name, elapsed: 0 })
    if (f === 'balloon') events.push({ id: 'forced-balloon', kind: 'balloon', name: calendar.balloons.name, elapsed: 0 })
    if (f === 'satellite') events.push({ id: 'forced-satellite', kind: 'satellite', name: 'Satellite pass', elapsed: 0 })
    if (f === 'aurora') events.push({ id: 'forced-aurora', kind: 'aurora', name: 'Aurora' })
    if (f === 'comet') events.push({ id: 'forced-comet', kind: 'comet', name: 'Comet' })
    if (f === 'eclipse') events.push({ id: 'forced-eclipse', kind: night ? 'eclipse-lunar' : 'eclipse-solar', name: 'Eclipse' })
    if (f === 'venus') events.push({ id: 'forced-venus', kind: 'planet', name: 'Venus', x: 0.78, y: 0.62 })
    const kind = calendar.weather.kinds.find(k => k.id === f)
    if (kind) {
      weather = landWeather({
        kind: kind.id as WeatherKind,
        wind: (kind.wind[0] + kind.wind[1]) / 2,
        clouds: kind.clouds,
        rainPerSecond: 'rainPerSecond' in kind ? (kind.rainPerSecond as number) : 0,
        boltEvery: 'boltEvery' in kind ? (kind.boltEvery as number) : 0,
        precip: 'rain',
        dust: false,
      }, (calendar.biomes as Record<string, { precip?: string; dust?: boolean }>)[biome])
    }
  }
  return { events, weather }
}
