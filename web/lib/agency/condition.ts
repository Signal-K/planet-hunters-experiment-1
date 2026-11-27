import { fleetLaunchTimes } from './fleet'
// Craft condition and servicing (SSL-852, Liam 17 Nov): orbiting craft wear down from use and time and from real
// solar storms, send less data as they wear, fail outright when worn out, and are put right by a servicing mission.
//
// Pure over the save: condition comes from when the craft was last serviced (or launched) and the storm days the
// save has seen. Storm days come from NOAA SWPC's planetary K-index feed (`fetchStormDays`) and are merged into the
// save, so a storm keeps counting after it drops out of NOAA's seven-day window.

import type { Player } from '@/lib/game-types'

/** Craft that wear. Ground telescopes and probes do not wear yet. */
export type ServicedCraftId = 'space-telescope' | 'saturn-satellite'
export const SERVICED_CRAFT: readonly ServicedCraftId[] = ['space-telescope', 'saturn-satellite']

/** Wear from use and time, in percent a day. */
export const WEAR_PER_DAY = 1.5
/** A storm day at Kp 5 (G1) and above costs (Kp - 4) x this, in percent. */
export const STORM_WEAR_PER_KP = 6
export const STORM_KP = 5
/** At or above this a craft sends all its data. */
export const FULL_DATA_AT = 50
/** Below this a craft has failed and sends nothing. */
export const FAILED_BELOW = 15
/** A servicing mission is offered below this. */
export const SERVICE_OFFER_BELOW = 75

const DAY_MS = 86_400_000

export type ConditionPlayer = Partial<Pick<Player, 'transitSatelliteLaunchedAt' | 'saturnImagerLaunchedAt' | 'craftServicedAt' | 'spaceStorms'>>

/** When the craft went up, or null when the agency does not have it. */
export function craftLaunchedAt(player: ConditionPlayer, craft: ServicedCraftId): number | null {
  const at = craft === 'space-telescope' ? player.transitSatelliteLaunchedAt : player.saturnImagerLaunchedAt
  return typeof at === 'number' && Number.isFinite(at) ? at : null
}

/** Wear began with the rule (17 Nov 2026): a craft launched before it starts from full on that day. */
export const WEAR_STARTED_AT = Date.parse('2026-11-17T00:00:00Z')

/** The last time the craft was put right: its last servicing mission, else its launch (or the day wear began). */
export function craftServicedAt(player: ConditionPlayer, craft: ServicedCraftId): number | null {
  const launched = craftLaunchedAt(player, craft)
  if (launched === null) return null
  const serviced = player.craftServicedAt?.[craft]
  if (typeof serviced === 'number' && Number.isFinite(serviced)) return Math.max(launched, serviced)
  return Math.max(launched, WEAR_STARTED_AT)
}

const dayKey = (at: number) => new Date(at).toISOString().slice(0, 10)

/** Storm days after `since`, up to and including `now`'s day, with their highest Kp. */
export function stormDaysSince(storms: Record<string, number> | undefined, since: number, now: number): Array<{ day: string; kp: number }> {
  const from = dayKey(since)
  const to = dayKey(now)
  return Object.entries(storms ?? {})
    .filter(([day, kp]) => day > from && day <= to && Number.isFinite(kp) && kp >= STORM_KP)
    .map(([day, kp]) => ({ day, kp }))
    .sort((a, b) => a.day.localeCompare(b.day))
}

export interface CraftCondition {
  craft: ServicedCraftId
  /** 0 to 100. */
  percent: number
  state: 'good' | 'worn' | 'failed'
  /** Storm days since the last service. */
  storms: number
  /** True when a servicing mission is on offer. */
  needsService: boolean
}

/** The craft's condition now, or null when the agency does not have it. */
export function craftCondition(player: ConditionPlayer, craft: ServicedCraftId, now: number): CraftCondition | null {
  const since = craftServicedAt(player, craft)
  if (since === null) return null
  const days = Math.max(0, (now - since) / DAY_MS)
  const storms = stormDaysSince(player.spaceStorms, since, now)
  const stormWear = storms.reduce((sum, storm) => sum + (Math.min(9, storm.kp) - (STORM_KP - 1)) * STORM_WEAR_PER_KP, 0)
  const percent = Math.max(0, Math.min(100, Math.round(100 - days * WEAR_PER_DAY - stormWear)))
  const state = percent < FAILED_BELOW ? 'failed' : percent < FULL_DATA_AT ? 'worn' : 'good'
  return { craft, percent, state, storms: storms.length, needsService: percent < SERVICE_OFFER_BELOW }
}

/** A day's data from a craft in this condition: all of it, half rounded up when worn, none once failed. */
export function conditionedCount(count: number, condition: Pick<CraftCondition, 'state'> | null): number {
  if (!condition || condition.state === 'good') return count
  if (condition.state === 'failed') return 0
  return Math.ceil(count / 2)
}

/** Craft that need servicing now, worst first. */
export function craftNeedingService(player: ConditionPlayer, now: number): CraftCondition[] {
  return SERVICED_CRAFT
    .map(craft => craftCondition(player, craft, now))
    .filter((c): c is CraftCondition => !!c && c.needsService)
    .sort((a, b) => a.percent - b.percent)
}

/** The craft a servicing mission puts right is back to 100%. */
export function serviceCraft<T extends ConditionPlayer>(player: T, craft: ServicedCraftId, at: number): T {
  return { ...player, craftServicedAt: { ...(player.craftServicedAt ?? {}), [craft]: at } }
}

// ---- Storm days from NOAA ----------------------------------------------------------------------------------

export const NOAA_KP_URL = 'https://services.swpc.noaa.gov/products/noaa-planetary-k-index.json'

/**
 * Storm days in NOAA's planetary K-index feed: each UTC day whose highest 3-hour Kp is 5 or more. Accepts the
 * current object-row format and the older array-of-arrays format (header row first).
 */
export function stormDaysFromKp(rows: unknown): Record<string, number> {
  if (!Array.isArray(rows)) return {}
  const out: Record<string, number> = {}
  for (const row of rows) {
    let time: unknown
    let kp: unknown
    if (Array.isArray(row)) [time, kp] = row
    else if (row && typeof row === 'object') ({ time_tag: time, Kp: kp } = row as { time_tag?: unknown; Kp?: unknown })
    const value = typeof kp === 'string' ? Number(kp) : kp
    if (typeof time !== 'string' || typeof value !== 'number' || !Number.isFinite(value) || value < STORM_KP) continue
    const day = time.slice(0, 10)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) continue
    out[day] = Math.max(out[day] ?? 0, Math.round(value * 100) / 100)
  }
  return out
}

/** Merge storm days, keeping each day's highest Kp. Days older than a year are dropped. */
export function mergeStormDays(a: Record<string, number> | undefined, b: Record<string, number> | undefined, now: number = Date.now()): Record<string, number> {
  const oldest = dayKey(now - 366 * DAY_MS)
  const out: Record<string, number> = {}
  for (const source of [a, b]) {
    for (const [day, kp] of Object.entries(source ?? {})) {
      if (day < oldest || typeof kp !== 'number' || !Number.isFinite(kp)) continue
      out[day] = Math.max(out[day] ?? 0, kp)
    }
  }
  return out
}

/** Latest-wins per craft: a later servicing on either device is the one that counts. */
export function mergeCraftServicedAt(a: Player['craftServicedAt'], b: Player['craftServicedAt']): Player['craftServicedAt'] {
  const out: NonNullable<Player['craftServicedAt']> = {}
  for (const craft of SERVICED_CRAFT) {
    const at = Math.max(a?.[craft] ?? 0, b?.[craft] ?? 0)
    if (at > 0) out[craft] = at
  }
  return out
}

/** The storm days NOAA reports for the last week, or null when the feed cannot be reached. */
export async function fetchStormDays(fetcher: typeof fetch = fetch): Promise<Record<string, number> | null> {
  try {
    const response = await fetcher(NOAA_KP_URL, { cache: 'no-store' })
    if (!response.ok) return null
    return stormDaysFromKp(await response.json())
  } catch {
    return null
  }
}

/** Each sortie is a separate craft. A fresh craft works even when an older one failed. */
export function fleetDataCount(player: ConditionPlayer & import('./fleet').FleetPlayer, craft: ServicedCraftId, perCraft: number, at: number, donated = false): number {
  const times = fleetLaunchTimes(player, craft)
  if (!times.length) return donated ? 0 : perCraft // Legacy pure digest callers; ownership is gated by the collector.
  const selected = donated ? (player.agencyDonations?.[craft] ? times.slice(1) : []) : player.agencyDonations?.[craft] ? times.slice(0, 1) : times
  return selected.reduce((sum, launchedAt) => sum + conditionedCount(perCraft, craftCondition({ ...player, [craft === 'space-telescope' ? 'transitSatelliteLaunchedAt' : 'saturnImagerLaunchedAt']: launchedAt }, craft, at)), 0)
}
/** The lowest condition in the fleet is the one servicing should address first. */
export function fleetCondition(player: ConditionPlayer & import('./fleet').FleetPlayer, craft: ServicedCraftId, at: number): CraftCondition | null {
  return fleetLaunchTimes(player, craft).map(launchedAt => craftCondition({ ...player, [craft === 'space-telescope' ? 'transitSatelliteLaunchedAt' : 'saturnImagerLaunchedAt']: launchedAt }, craft, at)!).sort((a, b) => a.percent - b.percent)[0] ?? null
}
