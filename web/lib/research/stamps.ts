import type { Player } from '@/lib/game-types'

/** What earned a stamp. Citizen science is an instrument feed, so every kind is an instrument or survey result, never a mission type. */
export const STAMP_KINDS = ['classification', 'survey', 'discovery-mission', 'event'] as const
export type StampKind = typeof STAMP_KINDS[number]
export type ResearchStamps = Record<string, StampKind[]>

type StampPlayer = Pick<Player, 'researchStamps'>

const DAY_KEY = /^\d{4}-\d{2}-\d{2}$/
const DAY_MS = 86_400_000

/** UTC day, the same clock the instrument daily downlink uses. */
export function stampDayKey(at: number): string {
  return new Date(at).toISOString().slice(0, 10)
}

const isKind = (v: unknown): v is StampKind => typeof v === 'string' && (STAMP_KINDS as readonly string[]).includes(v)

export function sanitizeStamps(raw: unknown): ResearchStamps {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {}
  const out: ResearchStamps = {}
  for (const [day, kinds] of Object.entries(raw)) {
    if (!DAY_KEY.test(day) || !Array.isArray(kinds)) continue
    const clean = STAMP_KINDS.filter(k => kinds.some(v => isKind(v) && v === k))
    if (clean.length) out[day] = clean
  }
  return out
}

/** Stamp the day `at` for this kind. Returns the same player when nothing changes. */
export function addStamp<T extends StampPlayer>(player: T, kind: StampKind, at: number): T {
  const day = stampDayKey(at)
  const have = player.researchStamps?.[day] ?? []
  if (have.includes(kind)) return player
  const next = STAMP_KINDS.filter(k => k === kind || have.includes(k))
  return { ...player, researchStamps: { ...(player.researchStamps ?? {}), [day]: next } }
}

/** Union per day, so two devices that stamped different tasks keep both. */
export function mergeStamps(a: unknown, b: unknown): ResearchStamps {
  const left = sanitizeStamps(a)
  const right = sanitizeStamps(b)
  const out: ResearchStamps = { ...left }
  for (const [day, kinds] of Object.entries(right)) {
    const have = out[day] ?? []
    out[day] = STAMP_KINDS.filter(k => have.includes(k) || kinds.includes(k))
  }
  return out
}

/**
 * Soft streak: consecutive stamped days ending today, or yesterday when today is
 * still open. A missed day ends the count but costs nothing else.
 */
export function stampStreak(stamps: ResearchStamps | undefined, now: number): number {
  const s = stamps ?? {}
  let day = now
  if (!s[stampDayKey(day)]) day -= DAY_MS
  let n = 0
  while (s[stampDayKey(day)]) { n += 1; day -= DAY_MS }
  return n
}

export interface CalendarCell { day: number; key: string; kinds: StampKind[]; today: boolean; future: boolean }

/** One month as weeks starting Monday. Cells before the 1st are null. */
export function monthGrid(year: number, month: number, stamps: ResearchStamps | undefined, now: number): (CalendarCell | null)[][] {
  const first = new Date(Date.UTC(year, month, 1))
  const length = new Date(Date.UTC(year, month + 1, 0)).getUTCDate()
  const lead = (first.getUTCDay() + 6) % 7
  const todayKey = stampDayKey(now)
  const cells: (CalendarCell | null)[] = Array.from({ length: lead }, () => null)
  for (let day = 1; day <= length; day += 1) {
    const key = new Date(Date.UTC(year, month, day)).toISOString().slice(0, 10)
    cells.push({ day, key, kinds: stamps?.[key] ?? [], today: key === todayKey, future: key > todayKey })
  }
  while (cells.length % 7) cells.push(null)
  const weeks: (CalendarCell | null)[][] = []
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7))
  return weeks
}

export function stampsInMonth(stamps: ResearchStamps | undefined, year: number, month: number): number {
  const prefix = `${year}-${String(month + 1).padStart(2, '0')}-`
  return Object.entries(stamps ?? {}).reduce((n, [day, kinds]) => n + (day.startsWith(prefix) ? kinds.length : 0), 0)
}

/** Placeholder until the community total is served: every player's stamps will add to one bar. */
export const COMMUNITY_GOAL = 1000
export const COMMUNITY_WEEKLY_REVENUE_PCT = 3

export function communityBar(ownThisMonth: number, communityOthers = 0) {
  const total = communityOthers + ownThisMonth
  return { total, goal: COMMUNITY_GOAL, fill: Math.min(1, total / COMMUNITY_GOAL), reached: total >= COMMUNITY_GOAL, bonusPct: COMMUNITY_WEEKLY_REVENUE_PCT }
}

/** Today's research tasks, one per stamp kind a player can earn now. Same copy on web and native. */
export const DAILY_TASKS: readonly { kind: StampKind; label: string }[] = [
  { kind: 'classification', label: 'Classify one item from your instruments' },
  { kind: 'survey', label: 'Finish a survey scan' },
  { kind: 'event', label: 'Catch debris during a sky event' },
]

export const RESEARCH_TITLE = 'Daily research'
export const RESEARCH_BLURB = 'Do one research task a day to earn a stamp. Every stamp fills the community bar, and a full bar pays everyone +3% weekly revenue. Miss a day and nothing is lost.'
