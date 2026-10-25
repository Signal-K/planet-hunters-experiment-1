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
