import { SKY_EVENTS } from '@/lib/world/sky-calendar'

export interface EventWeek { id: string; name: string; start: string; end: string; daysLeft: number }

const DAY_MS = 86_400_000

/** The meteor shower running on this UTC day, if any. Showers are the community research weeks. */
export function liveEventWeek(now: number): EventWeek | null {
  const d = new Date(now)
  const key = `${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`
  for (const s of SKY_EVENTS.meteorShowers) {
    const wraps = s.end < s.start
    const live = wraps ? key >= s.start || key <= s.end : key >= s.start && key <= s.end
    if (!live) continue
    const [em, ed] = s.end.split('-').map(Number)
    let endAt = Date.UTC(d.getUTCFullYear(), em - 1, ed)
    if (endAt < Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())) endAt = Date.UTC(d.getUTCFullYear() + 1, em - 1, ed)
    return { id: s.id, name: s.name, start: s.start, end: s.end, daysLeft: Math.max(0, Math.round((endAt - now) / DAY_MS)) }
  }
  return null
}

export interface FeaturedEvent extends EventWeek { live: boolean; startsInDays: number }

/** The flagship community research event: the shower running now, or the next one coming up. */
export function featuredEventWeek(now: number): FeaturedEvent | null {
  const live = liveEventWeek(now)
  if (live) return { ...live, live: true, startsInDays: 0 }
  const today = new Date(now)
  const todayStart = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate())
  let best: FeaturedEvent | null = null
  for (const s of SKY_EVENTS.meteorShowers) {
    const [sm, sd] = s.start.split('-').map(Number)
    let startAt = Date.UTC(today.getUTCFullYear(), sm - 1, sd)
    if (startAt < todayStart) startAt = Date.UTC(today.getUTCFullYear() + 1, sm - 1, sd)
    const days = Math.round((startAt - todayStart) / DAY_MS)
    if (!best || days < best.startsInDays) best = { id: s.id, name: s.name, start: s.start, end: s.end, daysLeft: 0, live: false, startsInDays: days }
  }
  return best
}

// SSL-775: the flagship event panel on Community research. Before a shower it previews what is coming and when,
// during it counts down to the peak and says what to do, and for a week after it keeps the player's record.

const HOUR_MS = 3_600_000
const ENDED_DAYS = 7

type Shower = (typeof SKY_EVENTS.meteorShowers)[number]

/** The year's occurrence of a MM-DD date (at `hourUtc`) nearest to `now`. */
function nearest(mmdd: string, now: number, hourUtc = 0): number {
  const [m, d] = mmdd.split('-').map(Number)
  const y = new Date(now).getUTCFullYear()
  return [y - 1, y, y + 1].map(year => Date.UTC(year, m - 1, d, hourUtc)).sort((a, b) => Math.abs(a - now) - Math.abs(b - now))[0]
}

/** The shower's window around `anchor` (its peak): start 00:00 UTC, end the close of its last day. */
function windowOf(s: Shower, now: number) {
  const peakUtc = 'peakUtc' in s && typeof s.peakUtc === 'string' ? Date.parse(s.peakUtc) : NaN
  const peakAt = Number.isFinite(peakUtc) && Math.abs(peakUtc - now) < 200 * 86_400_000 ? peakUtc : nearest(s.peak, now, 12)
  const startAt = nearest(s.start, peakAt)
  const endAt = nearest(s.end, peakAt) + 86_400_000
  return { startAt: Math.min(startAt, peakAt), peakAt, endAt: Math.max(endAt, peakAt) }
}

/** "4d 3h", "3h 20m", "12m". */
export function countdown(ms: number): string {
  const left = Math.max(0, ms)
  const days = Math.floor(left / 86_400_000)
  const hours = Math.floor((left % 86_400_000) / HOUR_MS)
  const minutes = Math.floor((left % HOUR_MS) / 60_000)
  if (days > 0) return `${days}d ${hours}h`
  if (hours > 0) return `${hours}h ${minutes}m`
  return `${minutes}m`
}

export interface EventPanel {
  id: string
  name: string
  phase: 'upcoming' | 'live' | 'ended'
  startAt: number
  peakAt: number
  endAt: number
  /** The next shower after this one, for the "after" panel. */
  next: { name: string; startsInDays: number } | null
}

/** Which shower the Community research panel features at `now`: the live one, one that ended this week, or the next. */
export function eventPanel(now: number): EventPanel | null {
  const showers = SKY_EVENTS.meteorShowers.map(s => ({ s, ...windowOf(s, now) }))
  const live = showers.find(w => now >= w.startAt && now < w.endAt)
  const upcoming = showers
    .map(w => (w.startAt > now ? w : { ...w, ...windowOf(w.s, now + 300 * 86_400_000) }))
    .filter(w => w.startAt > now)
    .sort((a, b) => a.startAt - b.startAt)
  const nextOf = (after: number) => {
    const n = upcoming.find(w => w.startAt > after)
    return n ? { name: n.s.name, startsInDays: Math.ceil((n.startAt - now) / 86_400_000) } : null
  }
  const panel = (w: (typeof showers)[number], phase: EventPanel['phase']): EventPanel =>
    ({ id: w.s.id, name: w.s.name, phase, startAt: w.startAt, peakAt: w.peakAt, endAt: w.endAt, next: nextOf(w.endAt - 1) })
  if (live) return panel(live, 'live')
  const ended = showers.filter(w => w.endAt <= now && now - w.endAt < ENDED_DAYS * 86_400_000).sort((a, b) => b.endAt - a.endAt)[0]
  if (ended) return panel(ended, 'ended')
  return upcoming[0] ? panel(upcoming[0], 'upcoming') : null
}
