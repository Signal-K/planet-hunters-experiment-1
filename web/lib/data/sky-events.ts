// Sky events and badges (SSL-491). One typed config, pure resolvers.
//
// Badge rule (Sky Events project, all games): gold when the activity is done
// during the event period, silver when done any time after. Before the event
// opens nothing is earned. Landnam had no badge system before this module.

import type { Player } from '@/lib/game-types'
import type { PlayerLocation } from '@/lib/game-types'
import { isInLocalEventBonusWindow } from './sky-event-window'

export type BadgeTier = 'gold' | 'silver'

/** Public cross-game destinations shown from the live Draconids event banner. */
export const WORLD_SPACE_WEEK_PLAYER_LINKS = [
  { label: 'Open Atlas badges', href: 'https://youratlas.cc/app/profile' },
  { label: 'Open Garden sky events', href: 'https://starsailors.space/game' },
] as const

/**
 * Public Orionids link on the events board. Landnam's own site, not Atlas.
 */
export const ATLAS_ORIONIDS_CHECKIN = {
  label: 'playlandnam.space',
  href: 'https://playlandnam.space',
} as const

export type SkyActivityKind =
  | 'launch'
  | 'saturn-classification'
  | 'asteroid-classification'
  | 'debris-mining'

/** SSL-714: the instrument the whole community launches together for a shower, the way a player launches their own telescope for long projects. */
export interface CommunityInstrument {
  /** Short callsign shown on the console, e.g. ORI-1. */
  callsign: string
  name: string
}

export interface SkyEvent {
  id: string
  name: string
  communityInstrument?: CommunityInstrument
  /** Inclusive start instant (UTC). */
  startUtc: string
  /** Exclusive end instant (UTC): first moment after the event period. */
  endUtc: string
  activities: ReadonlyArray<SkyActivityKind>
  /** When set, the gold window opens at the local midnight represented by `startUtc`. */
  startAtLocalMidnight?: boolean
  /** Recurring monthly event: later occurrences do not re-open the gold window. */
  recurring?: 'new-moon'
}

export interface PlayerBadge {
  eventId: string
  tier: BadgeTier
  earnedAt: number
}

// Dates are assumptions taken from the "Sky Events - World Space Week 2026"
// project (Space Week 4-10 Oct; Saturn/launch 7 Oct; Draconids 8 Oct; New
// Moon 10 Oct), expressed as whole UTC days.
export const SKY_EVENTS: ReadonlyArray<SkyEvent> = [
  {
    id: 'rocket-revolution-2026',
    name: 'Rocket Revolution',
    startUtc: '2026-10-04T00:00:00Z',
    endUtc: '2026-10-11T00:00:00Z',
    activities: ['launch'],
  },
  {
    id: 'saturn-night-2026',
    name: 'Saturn All Night',
    startUtc: '2026-10-04T00:00:00Z',
    endUtc: '2026-10-11T00:00:00Z',
    activities: ['saturn-classification'],
  },
  {
    id: 'draconids-2026',
    name: 'Draconids Dragon Dust',
    startUtc: '2026-10-06T00:00:00Z',
    endUtc: '2026-10-11T00:00:00Z',
    communityInstrument: { callsign: 'DRA-1', name: 'Draconids receiver' },
    activities: ['debris-mining'],
  },
  {
    id: 'orionids-2026',
    name: 'Orionids',
    // Gold opens at local midnight on 19 Oct, not this UTC instant.
    // badgeTierFor reads orionidsLocalStartMs() for this id.
    startUtc: '2026-10-19T00:00:00Z',
    endUtc: '2026-11-08T00:00:00Z',
    communityInstrument: { callsign: 'ORI-1', name: 'Orionids receiver' },
    activities: ['debris-mining'],
    startAtLocalMidnight: true,
  },
  {
    id: 'leonids-2026',
    name: 'Leonids',
    startUtc: '2026-11-17T00:00:00Z',
    endUtc: '2026-11-18T00:00:00Z',
    communityInstrument: { callsign: 'LEO-1', name: 'Leonids receiver' },
    activities: ['debris-mining'],
  },
  {
    id: 'geminids-2026',
    name: 'Geminids',
    startUtc: '2026-12-13T00:00:00Z',
    endUtc: '2026-12-15T00:00:00Z',
    communityInstrument: { callsign: 'GEM-1', name: 'Geminids receiver' },
    activities: ['debris-mining'],
  },
  {
    id: 'new-moon-hunt-2026-10',
    name: 'New Moon Asteroid Hunt',
    startUtc: '2026-10-10T00:00:00Z',
    endUtc: '2026-10-11T00:00:00Z',
    activities: ['asteroid-classification'],
    recurring: 'new-moon',
  },
]

export function getSkyEvent(eventId: string): SkyEvent | undefined {
  return SKY_EVENTS.find(event => event.id === eventId)
}

function toMs(at: Date | number): number {
  return at instanceof Date ? at.getTime() : at
}

/** A run started inside an event keeps that grade for this long after the event closes. */
export const RUN_START_GRACE_MS = 24 * 60 * 60 * 1000

/**
 * Instants a run-graded badge is judged at: the run's launch (when still within
 * the grace window) and now. Grants never downgrade, so granting at both keeps
 * gold for a run that began during the event and finished just after it.
 */
export function runGradingTimes(startedAt: number | null | undefined, now: number): number[] {
  if (typeof startedAt === 'number' && Number.isFinite(startedAt) && startedAt <= now && now - startedAt <= RUN_START_GRACE_MS) {
    return [startedAt, now]
  }
  return [now]
}

/** Gold during the event period, silver after it, null before it opens. */
export function badgeTierFor(eventId: string, at: Date | number): BadgeTier | null {
  const event = getSkyEvent(eventId)
  if (!event) return null
  const t = toMs(at)
  if (!Number.isFinite(t)) return null
  const start = new Date(event.startUtc)
  const open = event.startAtLocalMidnight
    ? localMidnightMs(start.getUTCFullYear(), start.getUTCMonth() + 1, start.getUTCDate())
    : Date.parse(event.startUtc)
  if (t < open) return null
  return t < Date.parse(event.endUtc) ? 'gold' : 'silver'
}

type BadgePlayer = Pick<Player, 'badges'>

/**
 * Idempotent grant. Returns the same player reference when nothing changes;
 * never downgrades gold to silver; upgrades silver to gold if earned in the
 * gold window later (only possible with out-of-order clocks).
 */
export function grantBadge<T extends BadgePlayer>(player: T, eventId: string, at: Date | number): T {
  const tier = badgeTierFor(eventId, at)
  if (!tier) return player
  const existing = player.badges?.[eventId]
  if (existing && (existing.tier === 'gold' || tier === 'silver')) return player
  return {
    ...player,
    badges: { ...(player.badges ?? {}), [eventId]: { eventId, tier, earnedAt: toMs(at) } },
  }
}

/** Event ids that an activity can earn. */
export function eventsForActivity(kind: SkyActivityKind): SkyEvent[] {
  return SKY_EVENTS.filter(event => event.activities.includes(kind))
}

/** Grants every badge the activity earns at `at`. Returns the new badges too. */
export function grantBadgesForActivity<T extends BadgePlayer>(
  player: T,
  kind: SkyActivityKind,
  at: Date | number,
  /** Restrict to one event (debris showers share the activity kind). */
  onlyEventId?: string,
): { player: T; granted: PlayerBadge[] } {
  let next = player
  const granted: PlayerBadge[] = []
  for (const event of eventsForActivity(kind)) {
    if (onlyEventId && event.id !== onlyEventId) continue
    const before = next
    next = grantBadge(next, event.id, at)
    if (next !== before) granted.push(next.badges![event.id])
  }
  return { player: next, granted }
}

/** Saturn classification tier (SSL-492 hook). */
export function resolveSaturnBadgeTier(submittedAt: number): BadgeTier | null {
  const tiers = eventsForActivity('saturn-classification').map(event => badgeTierFor(event.id, submittedAt))
  return tiers.includes('gold') ? 'gold' : tiers.includes('silver') ? 'silver' : null
}

export function sanitizeBadges(raw: unknown): Record<string, PlayerBadge> {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {}
  const out: Record<string, PlayerBadge> = {}
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    const v = value as Partial<PlayerBadge> | null
    if (!v || typeof v !== 'object') continue
    if (v.tier !== 'gold' && v.tier !== 'silver') continue
    if (typeof v.earnedAt !== 'number' || !Number.isFinite(v.earnedAt)) continue
    out[key] = { eventId: key, tier: v.tier, earnedAt: v.earnedAt }
  }
  return out
}

// ---- Debris events (SSL-475 Orionids, SSL-491 Draconids) -------------------
// One engine, driven by presets. Orionids, Leonids and Geminids fall any
// hour inside their window. Draconids stays a night shower. Outside the
// window the mining scene is the pre-event scene.
export interface DebrisEventPreset {
  eventId: string
  /** Shower window, UTC. */
  startUtc: string
  endUtc: string
  peakUtc: string
  /** Particles per minute at peak. */
  peakRatePerMinute: number
  /** Particles per minute at the window edges. */
  baseRatePerMinute: number
  /** Relative particle speed vs the Orionids baseline (1 = Orionids). */
  speedFactor: number
  label: string
  /** Sellable resource id (registered in MINERAL_META). */
  resourceId: string
  /** Chip text. */
  chipLabel: string
  /** When set, debris falls for the whole window, not only at night. */
  allHours?: boolean
  /** When set, the event opens at the local midnight represented by `startUtc`. */
  startAtLocalMidnight?: boolean
}

/** Local night: 22:00 until dawn (06:00). */
export const NIGHT_START_HOUR = 22
export const NIGHT_END_HOUR = 6

/** Local calendar date the Orionids shower opens (midnight, player's zone). */
export const ORIONIDS_LOCAL_START = { year: 2026, month: 10, day: 19 } as const
/** Teaser is up from 7 Oct 2026 local until that midnight. */
export const ORIONIDS_TEASER_OPEN = { year: 2026, month: 10, day: 7 } as const

export function localMidnightMs(year: number, month: number, day: number): number {
  return new Date(year, month - 1, day, 0, 0, 0, 0).getTime()
}

export function orionidsLocalStartMs(): number {
  return localMidnightMs(ORIONIDS_LOCAL_START.year, ORIONIDS_LOCAL_START.month, ORIONIDS_LOCAL_START.day)
}

export const ORIONIDS_DEBRIS_PRESET: DebrisEventPreset = {
  eventId: 'orionids-2026',
  // Real open instant is orionidsLocalStartMs(); this UTC stamp is not the gate.
  startUtc: '2026-10-19T00:00:00Z',
  endUtc: '2026-11-08T00:00:00Z',
  // Peak night 21-22 Oct.
  peakUtc: '2026-10-22T00:00:00Z',
  peakRatePerMinute: 12,
  baseRatePerMinute: 4,
  speedFactor: 1,
  label: 'Orionid debris',
  resourceId: 'orionid_debris',
  chipLabel: 'Orionids active',
  allHours: true,
  startAtLocalMidnight: true,
}

export const DRACONIDS_DEBRIS_PRESET: DebrisEventPreset = {
  eventId: 'draconids-2026',
  startUtc: '2026-10-06T00:00:00Z',
  endUtc: '2026-10-11T00:00:00Z',
  peakUtc: '2026-10-08T00:00:00Z',
  peakRatePerMinute: 2,
  baseRatePerMinute: 0.5,
  speedFactor: 0.4,
  label: 'Dragon dust',
  resourceId: 'draconid_debris',
  chipLabel: 'Draconids active',
}

/** Queued. Same shower config as the Orionids, inactive until 17 Nov. */
export const LEONIDS_DEBRIS_PRESET: DebrisEventPreset = {
  eventId: 'leonids-2026',
  startUtc: '2026-11-17T00:00:00Z',
  endUtc: '2026-11-18T00:00:00Z',
  peakUtc: '2026-11-17T12:00:00Z',
  peakRatePerMinute: 12,
  baseRatePerMinute: 4,
  speedFactor: 1,
  label: 'Leonid debris',
  resourceId: 'leonid_debris',
  chipLabel: 'Leonids active',
  allHours: true,
}

/** Queued. Same shower config as the Orionids, inactive until 13 Dec. */
export const GEMINIDS_DEBRIS_PRESET: DebrisEventPreset = {
  eventId: 'geminids-2026',
  startUtc: '2026-12-13T00:00:00Z',
  endUtc: '2026-12-15T00:00:00Z',
  peakUtc: '2026-12-14T00:00:00Z',
  peakRatePerMinute: 12,
  baseRatePerMinute: 4,
  speedFactor: 1,
  label: 'Geminid debris',
  resourceId: 'geminid_debris',
  chipLabel: 'Geminids active',
  allHours: true,
}

export const DEBRIS_PRESETS: ReadonlyArray<DebrisEventPreset> = [
  ORIONIDS_DEBRIS_PRESET,
  DRACONIDS_DEBRIS_PRESET,
  LEONIDS_DEBRIS_PRESET,
  GEMINIDS_DEBRIS_PRESET,
]

/** Resource ids that only exist during a debris event. */
export const DEBRIS_RESOURCE_IDS: ReadonlyArray<string> = DEBRIS_PRESETS.map(p => p.resourceId)

/** True between 22:00 and 06:00 in the runtime's local timezone. */
export function isLocalNight(at: Date | number): boolean {
  const t = toMs(at)
  if (!Number.isFinite(t)) return false
  const hour = new Date(t).getHours()
  return hour >= NIGHT_START_HOUR || hour < NIGHT_END_HOUR
}

/** Inclusive window open. A preset may opt into a local-midnight opening. */
export function debrisWindowStartMs(preset: DebrisEventPreset): number {
  if (preset.startAtLocalMidnight) {
    const start = new Date(preset.startUtc)
    return localMidnightMs(start.getUTCFullYear(), start.getUTCMonth() + 1, start.getUTCDate())
  }
  return Date.parse(preset.startUtc)
}

/** Window (start inclusive / end exclusive). All-hour showers skip the night gate. Pure. */
export function isDebrisEventActive(preset: DebrisEventPreset, now: Date | number): boolean {
  const t = toMs(now)
  if (!Number.isFinite(t)) return false
  if (t < debrisWindowStartMs(preset) || t >= Date.parse(preset.endUtc)) return false
  if (preset.allHours) return true
  return isLocalNight(t)
}

/** First active preset, or null. Windows do not overlap. */
export function activeDebrisPreset(now: Date | number): DebrisEventPreset | null {
  return DEBRIS_PRESETS.find(preset => isDebrisEventActive(preset, now)) ?? null
}

/** Particles per minute now: 0 when inactive, else a linear ramp base -> peak -> base. */
export function debrisRatePerMinute(preset: DebrisEventPreset, now: Date | number, location?: PlayerLocation | null): number {
  if (!isDebrisEventActive(preset, now)) return 0
  const t = toMs(now)
  const start = debrisWindowStartMs(preset)
  const end = Date.parse(preset.endUtc)
  const peak = Date.parse(preset.peakUtc)
  const half = Math.max(peak - start, end - peak, 1)
  const closeness = Math.max(0, 1 - Math.abs(t - peak) / half)
  const rate = preset.baseRatePerMinute + (preset.peakRatePerMinute - preset.baseRatePerMinute) * closeness
  return preset.eventId === 'orionids-2026' && isInLocalEventBonusWindow(t, location) ? rate * ORIONIDS_PEAK_MULTIPLIER : rate
}

/**
 * Shower-run fragments per minute, caught with CATCH (SSL-711). Above the 20 goal so a player who
 * weaves and catches most of them fills it in about a minute; one who parks catches a minority,
 * and the rest break up on the ground. Peak night doubles it, like the launch catch.
 */
export const ORIONIDS_RUN_FRAGMENTS_PER_MINUTE = 28

/** SSL-578: peak-night debris boost (21-22 Oct, local night). */
export const ORIONIDS_PEAK_MULTIPLIER = 2

/** Local 21 Oct 18:00 until 22 Oct 06:00, in the player's zone. */
export function isOrionidsPeakNight(at: Date | number): boolean {
  const t = toMs(at)
  if (!Number.isFinite(t)) return false
  return t >= new Date(2026, 9, 21, 18, 0, 0, 0).getTime() && t < new Date(2026, 9, 22, 6, 0, 0, 0).getTime()
}

/** Inside the Orionids window (local 19 Oct midnight to 8 Nov), day or night. */
export function isOrionidsWindow(at: Date | number): boolean {
  const t = toMs(at)
  if (!Number.isFinite(t)) return false
  return t >= orionidsLocalStartMs() && t < Date.parse(ORIONIDS_DEBRIS_PRESET.endUtc)
}

export type OrionidsPhase = 'teaser' | 'active' | 'peak' | 'ended' | 'off'

export function orionidsPhase(at: Date | number): OrionidsPhase {
  if (isOrionidsPeakNight(at)) return 'peak'
  if (isOrionidsWindow(at)) return 'active'
  if (isOrionidsTeaserWindow(at)) return 'teaser'
  const t = toMs(at)
  return Number.isFinite(t) && t >= Date.parse(ORIONIDS_DEBRIS_PRESET.endUtc) ? 'ended' : 'off'
}

/** Event panel copy, shared by web and native (mirrored in SkyEvents.swift). */
export const ORIONIDS_PANEL = {
  title: 'Orionids',
  what: 'Dust from Halley\'s Comet hits the atmosphere as meteors. The rocket flies through it on the way up.',
  when: '19 Oct to 7 Nov. Fragments fall any time you launch, not only at night. Peak night catches twice as many.',
  peak: 'Peak night 21-22 Oct: twice the fragments from 18:00. At 02:00 on 22 Oct one fireball fragment falls.',
  steps: [
    'Launch through the shower. Fragments are caught on the way up.',
    'They take no cargo space.',
    'Redeem 2 for research, or combine 15 into a fireball.',
    'Sell the rest at the Exchange. The payout is a modest bonus.',
  ],
} as const

export function orionidsShareText(tier: BadgeTier): string {
  return `I earned the ${tier} Orionids 2026 badge in Landnam by mining meteor debris.`
}

/** One peak reminder, local 22 Oct 02:00 (after moonset). */
export const ORIONIDS_PEAK_REMINDER = {
  title: 'Orionids peak',
  body: "Moon's down — look up. Orionids peak; debris is falling in Landnam.",
} as const

export function orionidsPeakReminderMs(): number {
  return new Date(2026, 9, 22, 2, 0, 0, 0).getTime()
}

/** Resource units granted for one mined debris chunk. */
export const DEBRIS_UNITS_PER_CHUNK = 1

/** True from 7 Oct 2026 local until the shower opens at local midnight on the 19th. */
export function isOrionidsTeaserWindow(now: Date | number): boolean {
  const t = toMs(now)
  if (!Number.isFinite(t)) return false
  const open = localMidnightMs(ORIONIDS_TEASER_OPEN.year, ORIONIDS_TEASER_OPEN.month, ORIONIDS_TEASER_OPEN.day)
  return t >= open && t < orionidsLocalStartMs()
}

/** Whole local days and leftover hours until 19 Oct local midnight. */
export function orionidsCountdown(now: Date | number): { days: number; hours: number } {
  const remain = Math.max(0, orionidsLocalStartMs() - toMs(now))
  const totalHours = Math.floor(remain / 3_600_000)
  return { days: Math.floor(totalHours / 24), hours: totalHours % 24 }
}

/** Local calendar day, used so the teaser shows at most once per day. */
export function orionidsTeaserDayKey(now: Date | number): string {
  const d = new Date(toMs(now))
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${month}-${day}`
}

/**
 * Show the Base teaser. `forced` skips the window and the once-per-day cap
 * so a dev switch can open the coming-soon state on demand.
 */
export function shouldShowOrionidsTeaser(now: Date | number, seenDay: string | null, forced: boolean): boolean {
  if (forced) return true
  if (!isOrionidsTeaserWindow(now)) return false
  return seenDay !== orionidsTeaserDayKey(now)
}

/**
 * First debris mined during a preset's event: grants that event's badge via
 * the shared 'debris-mining' hook. Idempotent (badge shows once).
 */
export function applyDebrisMined<T extends BadgePlayer>(
  player: T,
  preset: DebrisEventPreset,
  at: Date | number,
): { player: T; badge: PlayerBadge | null } {
  let next = player
  let badge: PlayerBadge | null = null
  const startedAt = (player as { missionStartedAt?: number | null }).missionStartedAt
  for (const time of runGradingTimes(startedAt, toMs(at))) {
    const result = grantBadgesForActivity(next, 'debris-mining', time, preset.eventId)
    next = result.player
    badge = result.granted[0] ?? badge
  }
  return { player: next, badge }
}

// ---- New Moon --------------------------------------------------------------
export const SYNODIC_MONTH_DAYS = 29.530588853
/** Reference mean new moon: 2000-01-06 18:14 UTC. */
export const NEW_MOON_REFERENCE_MS = Date.UTC(2000, 0, 6, 18, 14, 0)

const DAY_MS = 86_400_000
// Mean new moon of lunation k=0 (JDE 2451550.09766, 2000-01-06 ~14:21 UTC).
// The 18:14 UTC reference above is the *true* new moon of that lunation, i.e.
// the mean plus its periodic correction, so the correction is applied on this
// mean epoch instead.
const MEEUS_MEAN_EPOCH_MS = (2451550.09766 - 2440587.5) * DAY_MS
const RAD = Math.PI / 180

/**
 * UTC instant of the k-th new moon after the reference. Starts from the mean
 * synodic month and applies the leading periodic terms (Meeus, Astronomical
 * Algorithms ch. 49); the mean alone drifts up to ~14 h from the real phase,
 * which would put the 10 Oct 2026 new moon on the wrong calendar day.
 */
export function newMoonInstantMs(k: number): number {
  const mean = MEEUS_MEAN_EPOCH_MS + k * SYNODIC_MONTH_DAYS * DAY_MS
  const T = k / 1236.85
  const E = 1 - 0.002516 * T - 0.0000074 * T * T
  const M = (2.5534 + 29.1053567 * k) * RAD
  const Mp = (201.5643 + 385.81693528 * k) * RAD
  const F = (160.7108 + 390.67050284 * k) * RAD
  const correction =
    -0.4072 * Math.sin(Mp) +
    0.17241 * E * Math.sin(M) +
    0.01608 * Math.sin(2 * Mp) +
    0.01039 * Math.sin(2 * F) +
    0.00739 * E * Math.sin(Mp - M) -
    0.00514 * E * Math.sin(Mp + M) +
    0.00208 * E * E * Math.sin(2 * M) -
    0.00111 * Math.sin(Mp - 2 * F) -
    0.00057 * Math.sin(Mp + 2 * F)
  return mean + correction * DAY_MS
}

/** True when a new moon falls within the given UTC calendar day (YYYY-MM-DD). */
export function isNewMoonDay(dateKey: string): boolean {
  const dayStart = Date.parse(`${dateKey}T00:00:00Z`)
  if (!Number.isFinite(dayStart)) return false
  const dayEnd = dayStart + DAY_MS
  const kMid = Math.round((dayStart + DAY_MS / 2 - NEW_MOON_REFERENCE_MS) / (SYNODIC_MONTH_DAYS * DAY_MS))
  for (let k = kMid - 1; k <= kMid + 1; k += 1) {
    const t = newMoonInstantMs(k)
    if (t >= dayStart && t < dayEnd) return true
  }
  return false
}

// ---- Dev clock -------------------------------------------------------------
const ORIONIDS_FORCE_KEY = 'landnam.forceOrionids'
const ORIONIDS_TEASER_FORCE_KEY = 'landnam.forceOrionidsTeaser'
export const ORIONIDS_TEASER_SEEN_KEY = 'landnam.orionidsTeaserDay'

/**
 * Local 21 Oct 2026, 23:00. Inside the Orionids window, on the peak night,
 * and inside the 22:00–06:00 night gate in whatever timezone the player is in.
 */
export function orionidsForcedInstant(): number {
  return new Date(2026, 9, 21, 23, 0, 0, 0).getTime()
}

/** Local 12 Oct 2026, 15:00. Inside the teaser window, before the shower opens. */
export function orionidsTeaserForcedInstant(): number {
  return new Date(2026, 9, 12, 15, 0, 0, 0).getTime()
}

/**
 * Persist `?orionids=` before hydration strips the query.
 * `1` forces the shower, `teaser` forces the coming-soon card, `0` clears both.
 * `window.__LANDNAM_FORCE_ORIONIDS` and `__LANDNAM_FORCE_ORIONIDS_TEASER`
 * force this page only. Callers still gate on the dev launcher.
 */
export function captureOrionidsQueryFlag(): void {
  if (typeof window === 'undefined') return
  try {
    const query = new URLSearchParams(window.location.search).get('orionids')
    if (query === '1') {
      window.localStorage.setItem(ORIONIDS_FORCE_KEY, '1')
      window.localStorage.removeItem(ORIONIDS_TEASER_FORCE_KEY)
    } else if (query === 'teaser') {
      window.localStorage.setItem(ORIONIDS_TEASER_FORCE_KEY, '1')
      window.localStorage.removeItem(ORIONIDS_FORCE_KEY)
    } else if (query === '0') {
      window.localStorage.removeItem(ORIONIDS_FORCE_KEY)
      window.localStorage.removeItem(ORIONIDS_TEASER_FORCE_KEY)
    }
  } catch {
    // Private mode: the page-local flags below still work.
  }
}

export function orionidsDevForced(): boolean {
  if (typeof window === 'undefined') return false
  const flag = (window as unknown as { __LANDNAM_FORCE_ORIONIDS?: boolean }).__LANDNAM_FORCE_ORIONIDS
  if (flag === true) return true
  captureOrionidsQueryFlag()
  try {
    return window.localStorage.getItem(ORIONIDS_FORCE_KEY) === '1'
  } catch {
    return false
  }
}

/**
 * Dev/staging force switch for the coming-soon teaser.
 * `?orionids=teaser` sticks until cleared, `?orionids=0` clears it,
 * `window.__LANDNAM_FORCE_ORIONIDS_TEASER = true` forces this page.
 * `?orionids=1` turns the shower on and this switch off.
 */
export function orionidsTeaserDevForced(): boolean {
  if (typeof window === 'undefined') return false
  const flag = (window as unknown as { __LANDNAM_FORCE_ORIONIDS_TEASER?: boolean }).__LANDNAM_FORCE_ORIONIDS_TEASER
  if (flag === true) return true
  captureOrionidsQueryFlag()
  try {
    return window.localStorage.getItem(ORIONIDS_TEASER_FORCE_KEY) === '1'
  } catch {
    return false
  }
}

/**
 * Current time for badge grants. In dev/staging only, `window.__LANDNAM_DEV_NOW`
 * (ms or ISO string) overrides it so tiers can be tested without moving the
 * system clock. Production ignores it.
 */
export function skyEventNow(devEnabled: boolean): number {
  if (devEnabled && typeof window !== 'undefined') {
    const raw = (window as unknown as { __LANDNAM_DEV_NOW?: number | string }).__LANDNAM_DEV_NOW
    const parsed = typeof raw === 'string' ? Date.parse(raw) : raw
    if (typeof parsed === 'number' && Number.isFinite(parsed)) return parsed
  }
  return Date.now()
}
