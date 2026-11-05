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
