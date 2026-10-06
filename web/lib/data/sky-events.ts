// Sky events and badges (SSL-491). One typed config, pure resolvers.
//
// Badge rule (Sky Events project, all games): gold when the activity is done
// during the event period, silver when done any time after. Before the event
// opens nothing is earned. Landnam had no badge system before this module.

import type { Player } from '@/lib/game-types'

export type BadgeTier = 'gold' | 'silver'

export type SkyActivityKind =
  | 'launch'
  | 'saturn-classification'
  | 'asteroid-classification'
  | 'debris-mining'

export interface SkyEvent {
  id: string
  name: string
  /** Inclusive start instant (UTC). */
  startUtc: string
  /** Exclusive end instant (UTC): first moment after the event period. */
  endUtc: string
  activities: ReadonlyArray<SkyActivityKind>
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
    activities: ['debris-mining'],
  },
  {
    id: 'orionids-2026',
    name: 'Orionids',
    startUtc: '2026-10-20T00:00:00Z',
    endUtc: '2026-11-08T00:00:00Z',
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

/** Gold during the event period, silver after it, null before it opens. */
export function badgeTierFor(eventId: string, at: Date | number): BadgeTier | null {
  const event = getSkyEvent(eventId)
  if (!event) return null
  const t = toMs(at)
  if (!Number.isFinite(t)) return null
  if (t < Date.parse(event.startUtc)) return null
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
// One engine, driven by presets. A preset is only "active" inside its UTC
// window AND during the player's local night, so outside it the mining scene
// is exactly the pre-event scene.
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
}

/** Local night: 22:00 until dawn (06:00). */
export const NIGHT_START_HOUR = 22
export const NIGHT_END_HOUR = 6

export const ORIONIDS_DEBRIS_PRESET: DebrisEventPreset = {
  eventId: 'orionids-2026',
  startUtc: '2026-10-20T00:00:00Z',
  endUtc: '2026-11-08T00:00:00Z',
  // Peak night 21-22 Oct.
  peakUtc: '2026-10-22T00:00:00Z',
  peakRatePerMinute: 12,
  baseRatePerMinute: 4,
  speedFactor: 1,
  label: 'Orionid debris',
  resourceId: 'orionid_debris',
  chipLabel: 'Orionids active',
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

export const DEBRIS_PRESETS: ReadonlyArray<DebrisEventPreset> = [ORIONIDS_DEBRIS_PRESET, DRACONIDS_DEBRIS_PRESET]

/** Resource ids that only exist during a debris event. */
export const DEBRIS_RESOURCE_IDS: ReadonlyArray<string> = DEBRIS_PRESETS.map(p => p.resourceId)

/** True between 22:00 and 06:00 in the runtime's local timezone. */
export function isLocalNight(at: Date | number): boolean {
  const t = toMs(at)
  if (!Number.isFinite(t)) return false
  const hour = new Date(t).getHours()
  return hour >= NIGHT_START_HOUR || hour < NIGHT_END_HOUR
}

/** Window (UTC, start inclusive / end exclusive) AND local night. Pure. */
export function isDebrisEventActive(preset: DebrisEventPreset, now: Date | number): boolean {
  const t = toMs(now)
  if (!Number.isFinite(t)) return false
  if (t < Date.parse(preset.startUtc) || t >= Date.parse(preset.endUtc)) return false
  return isLocalNight(t)
}

/** First active preset, or null. Windows do not overlap. */
export function activeDebrisPreset(now: Date | number): DebrisEventPreset | null {
  return DEBRIS_PRESETS.find(preset => isDebrisEventActive(preset, now)) ?? null
}

/** Particles per minute now: 0 when inactive, else a linear ramp base -> peak -> base. */
export function debrisRatePerMinute(preset: DebrisEventPreset, now: Date | number): number {
  if (!isDebrisEventActive(preset, now)) return 0
  const t = toMs(now)
  const start = Date.parse(preset.startUtc)
  const end = Date.parse(preset.endUtc)
  const peak = Date.parse(preset.peakUtc)
  const half = Math.max(peak - start, end - peak, 1)
  const closeness = Math.max(0, 1 - Math.abs(t - peak) / half)
  return preset.baseRatePerMinute + (preset.peakRatePerMinute - preset.baseRatePerMinute) * closeness
}

/** Resource units granted for one mined debris chunk. */
export const DEBRIS_UNITS_PER_CHUNK = 1

/**
 * First debris mined during a preset's event: grants that event's badge via
 * the shared 'debris-mining' hook. Idempotent (badge shows once).
 */
export function applyDebrisMined<T extends BadgePlayer>(
  player: T,
  preset: DebrisEventPreset,
  at: Date | number,
): { player: T; badge: PlayerBadge | null } {
  const { player: next, granted } = grantBadgesForActivity(player, 'debris-mining', at, preset.eventId)
  return { player: next, badge: granted[0] ?? null }
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
