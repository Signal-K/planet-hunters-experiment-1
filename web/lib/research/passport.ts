import type { Player } from '@/lib/game-types'
import { PASSPORT_GOAL, PASSPORT_START_WEEK, weeklyRocketPart } from '@/lib/data/weeklyRocketParts'
import { weekKey } from './paths'
import { STAMP_KINDS, stampDayKey, type StampKind } from './stamps'

export interface PassportWeek { week: string; total: number; mine: number; goal: number; reachedAt: number | null; earned: boolean }
export interface PassportResponse { weeks: PassportWeek[] }
const DAY = 86_400_000
export const STAMP_LABELS: Record<StampKind, string> = { launch: 'Launch', classification: 'Signal', survey: 'Survey', 'discovery-mission': 'Discovery', event: 'Sky event', 'exchange-sale': 'Trade', 'contract-run': 'Contract', 'price-alert': 'Alert', gift: 'Gift', review: 'Review', 'probe-observation': 'Probe' }
export function passportDays(player: Pick<Player, 'researchStamps' | 'researchFirstStamps'>, week: string, now: number) {
  const start = Date.parse(`${week}T00:00:00Z`)
  const today = stampDayKey(now)
  return Array.from({ length: 7 }, (_, i) => {
    const key = stampDayKey(start + i * DAY)
    const kinds = player.researchStamps?.[key] ?? []
    const first = player.researchFirstStamps?.[key]?.kind
    const kind = key > today ? undefined : first && kinds.includes(first) ? first : kinds[0]
    return { key, kind, today: key === today, future: key > today }
  })
}
export function mergePassportWeeks(a: Player['researchPassportWeeks'], b: Player['researchPassportWeeks']): NonNullable<Player['researchPassportWeeks']> {
  const result: NonNullable<Player['researchPassportWeeks']> = {}
  for (const raw of [...Object.values(a ?? {}), ...Object.values(b ?? {})]) {
    if (!raw || !weeklyRocketPart(raw.week) || !Number.isFinite(raw.total) || !Number.isFinite(raw.mine)) continue
    const prev = result[raw.week]
    const reached = typeof raw.reachedAt === 'number' && Number.isFinite(raw.reachedAt) ? raw.reachedAt : null
    result[raw.week] = { week: raw.week, goal: PASSPORT_GOAL, total: Math.max(0, prev?.total ?? 0, Math.floor(raw.total)), mine: Math.min(7, Math.max(0, prev?.mine ?? 0, Math.floor(raw.mine))), reachedAt: prev?.reachedAt ?? reached, earned: !!(prev?.earned || (raw.earned && raw.mine > 0 && reached != null)) }
  }
  return result
}
export function withPassportRewards<T extends Pick<Player, 'researchPassportWeeks' | 'researchRocketParts'>>(player: T, response: PassportResponse | null): T {
  if (!response) return player
  const incoming = Object.fromEntries(response.weeks.map(row => [row.week, row]))
  const weeks = mergePassportWeeks(player.researchPassportWeeks, incoming)
  const parts = new Set(player.researchRocketParts ?? [])
  for (const row of Object.values(weeks)) if (row.earned) { const part = weeklyRocketPart(row.week); if (part) parts.add(part.id) }
  if (JSON.stringify(weeks) === JSON.stringify(player.researchPassportWeeks ?? {}) && parts.size === (player.researchRocketParts ?? []).length) return player
  return { ...player, researchPassportWeeks: weeks, researchRocketParts: [...parts] }
}
export function passportWeekRange(player: Pick<Player, 'researchStamps' | 'researchPassportWeeks'>, now: number): string[] {
  const current = weekKey(now)
  const known = [...Object.keys(player.researchPassportWeeks ?? {}), ...Object.keys(player.researchStamps ?? {}).filter(day => Number.isFinite(Date.parse(`${day}T00:00:00Z`))).map(day => weekKey(Date.parse(`${day}T00:00:00Z`)))].filter(week => week >= PASSPORT_START_WEEK && week <= current)
  const first = known.sort()[0] ?? current
  const result: string[] = []
  for (let at = Date.parse(`${current}T00:00:00Z`); stampDayKey(at) >= first; at -= 7 * DAY) result.push(stampDayKey(at))
  return result
}
export function sanitizeFirstStamps(raw: Player['researchFirstStamps']): NonNullable<Player['researchFirstStamps']> {
  return Object.fromEntries(Object.entries(raw ?? {}).filter(([day, first]) => first && STAMP_KINDS.includes(first.kind) && Number.isFinite(first.at) && Number.isFinite(new Date(first.at).getTime()) && stampDayKey(first.at) === day))
}
export function mergeFirstStamps(a: Player['researchFirstStamps'], b: Player['researchFirstStamps']) {
  const result = sanitizeFirstStamps(a)
  for (const [day, first] of Object.entries(sanitizeFirstStamps(b))) if (!result[day] || first.at < result[day].at) result[day] = first
  return result
}
