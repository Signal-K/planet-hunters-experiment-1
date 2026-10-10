import type { Mission } from '@/lib/data/types'
import { badgeTierFor, getSkyEvent, type BadgeTier, type PlayerBadge, type SkyActivityKind } from '@/lib/data/sky-events'

/**
 * World Space Week flags (SSL-491). The week is the four sky events that open
 * 4-10 Oct 2026; Orionids is a separate October event and is not part of it.
 * Each event has one category, taken from the activity that earns its badge.
 */
export const WSW_EVENT_IDS: ReadonlyArray<string> = [
  'rocket-revolution-2026',
  'saturn-night-2026',
  'draconids-2026',
  'new-moon-hunt-2026-10',
]

export const WSW_RANGE_LABEL = '4-10 OCT'

const WSW_ENDS_UTC = Date.parse('2026-10-11T00:00:00Z')

const CATEGORY_LABEL: Record<SkyActivityKind, string> = {
  launch: 'Launch',
  'saturn-classification': 'Saturn',
  'debris-mining': 'Meteor',
  'asteroid-classification': 'New Moon',
}

export type WswChipState = 'gold-earned' | 'silver-earned' | 'gold-open' | 'silver-open'

export interface WswChip {
  eventId: string
  /** Event name, e.g. "Rocket Revolution". */
  name: string
  /** WSW category, e.g. "Launch". */
  category: string
  state: WswChipState
  /** Short uppercase text for the chip. */
  label: string
}

export function isWswEvent(eventId: string): boolean {
  return WSW_EVENT_IDS.includes(eventId)
}

export function isWorldSpaceWeekLive(now: Date | number): boolean {
  const t = now instanceof Date ? now.getTime() : now
  return Number.isFinite(t) && t >= Date.parse('2026-10-04T00:00:00Z') && t < WSW_ENDS_UTC
}

const STATE_TEXT: Record<WswChipState, string> = {
  'gold-earned': 'Gold earned',
  'silver-earned': 'Silver earned',
  'gold-open': 'Gold open',
  'silver-open': 'Silver open',
}

export function wswChip(eventId: string, badges: Record<string, PlayerBadge> | undefined, now: Date | number): WswChip | null {
  const event = getSkyEvent(eventId)
  if (!event || !isWswEvent(eventId)) return null
  const earned = badges?.[eventId]
  const tier: BadgeTier | null = earned ? earned.tier : badgeTierFor(eventId, now)
  if (!tier) return null
  const state: WswChipState = earned ? `${tier}-earned` : `${tier}-open`
  const category = CATEGORY_LABEL[event.activities[0]]
  return { eventId, name: event.name, category, state, label: `${category} ${STATE_TEXT[state]}` }
}

/**
 * Which WSW events a mission type can earn. Every mission launches a rocket, so
 * all carry the Launch category. Mining adds the meteor category (Draconids
 * debris), and an instrument launch adds the category of the data that
 * instrument serves.
 */
export function wswEventIdsForMission(mission: Pick<Mission, 'payload' | 'construction'>): string[] {
  const ids = ['rocket-revolution-2026']
  const instrument = mission.payload?.instrumentId
  if (instrument === 'saturn-imager') ids.push('saturn-night-2026')
  else if (instrument === 'deep-space-telescope') ids.push('new-moon-hunt-2026-10')
  else if (!mission.payload && !mission.construction) ids.push('draconids-2026')
  return ids
}

export function wswChipsForMission(
  mission: Pick<Mission, 'payload' | 'construction'>,
  badges: Record<string, PlayerBadge> | undefined,
  now: Date | number,
): WswChip[] {
  return wswEventIdsForMission(mission).flatMap(id => wswChip(id, badges, now) ?? [])
}

/** WSW events a piece of Control Station equipment serves, by instrument id. */
export function wswEventIdsForInstrument(equipmentId: string): string[] {
  if (equipmentId === 'saturn-imager') return ['saturn-night-2026']
  if (equipmentId === 'deep-space-telescope') return ['new-moon-hunt-2026-10']
  return []
}

export interface WswBanner {
  live: boolean
  title: string
  detail: string
  earned: number
  total: number
}

export function wswBanner(badges: Record<string, PlayerBadge> | undefined, now: Date | number): WswBanner {
  const live = isWorldSpaceWeekLive(now)
  const earned = WSW_EVENT_IDS.filter(id => !!badges?.[id]).length
  return {
    live,
    title: live ? `World Space Week ${WSW_RANGE_LABEL}` : 'World Space Week ended',
    detail: live ? 'Gold badges while it runs. Silver after.' : 'Silver badges are still open.',
    earned,
    total: WSW_EVENT_IDS.length,
  }
}
