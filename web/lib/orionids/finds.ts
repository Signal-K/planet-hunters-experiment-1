// Orionids planet finds (SSL-578). A planet classified or charted during the
// shower gets an Orionids-found marker, an owned voucher, and meteorite
// mastery 1. Silver after the window. The voucher is not redeemable yet.

import { WSW_EVENT_IDS } from '@/lib/wsw'
import {
  badgeTierFor,
  type BadgeTier,
  type PlayerBadge,
} from '@/lib/data/sky-events'

export const ORIONIDS_EVENT_ID = 'orionids-2026'
export const ORIONIDS_FOUND_MARKER = 'orionids-found' as const
export const ORIONIDS_SOURCE = 'landnam'
export const ORIONIDS_VOUCHER = 'owned' as const
export const METEORITE_MASTERY_LEVEL = 1
export const SPACETOBER_WEEK_BADGE = 'spacetober-2026-week'
export const SPACETOBER_PEAK_BADGE = 'spacetober-2026-peak'
const TRAINING_PREFIX = 'training-'

export interface OrionidsFind {
  subjectId: string
  targetId: string | null
  name: string
  tier: BadgeTier
  earnedAt: number
  marker: typeof ORIONIDS_FOUND_MARKER
  voucher: typeof ORIONIDS_VOUCHER
}

export type FindPlayer = {
  badges?: Record<string, PlayerBadge>
  orionidsFinds?: Record<string, OrionidsFind>
  meteoriteMastery?: number
  tessClassifications?: Record<string, { subjectId: string; verdict: string; submittedAt: number }>
  discoveredExoplanetTargets?: Record<string, { id: string; name: string }>
}

export function orionidsFindTier(at: number): BadgeTier | null {
  return badgeTierFor(ORIONIDS_EVENT_ID, at)
}

function setBadge(
  badges: Record<string, PlayerBadge> | undefined,
  id: string,
  tier: BadgeTier,
  earnedAt: number,
): Record<string, PlayerBadge> {
  const existing = badges?.[id]
  if (existing && (existing.tier === 'gold' || tier === 'silver')) return badges ?? {}
  return { ...(badges ?? {}), [id]: { eventId: id, tier, earnedAt } }
}

function bestBadge(badges: Array<PlayerBadge | undefined>): PlayerBadge | null {
  const present = badges.filter((badge): badge is PlayerBadge => !!badge)
  if (present.length === 0) return null
  const gold = present.filter(badge => badge.tier === 'gold')
  const pool = gold.length > 0 ? gold : present
  return pool.reduce((earliest, badge) => badge.earnedAt < earliest.earnedAt ? badge : earliest)
}

/** Idempotent. Never downgrades gold. Mastery stays at least 1 once granted. */
export function grantOrionidsPlanetFind<T extends FindPlayer>(
  player: T,
  find: { subjectId: string; targetId?: string | null; name?: string; at: number },
): { player: T; granted: OrionidsFind | null; masteryGranted: boolean } {
  const subjectId = find.subjectId.trim()
  const tier = orionidsFindTier(find.at)
  if (!tier || !subjectId || subjectId.startsWith(TRAINING_PREFIX)) {
    return { player, granted: null, masteryGranted: false }
  }
  const existing = player.orionidsFinds?.[subjectId]
  if (existing && (existing.tier === 'gold' || tier === 'silver')) {
    return { player, granted: null, masteryGranted: false }
  }
  const record: OrionidsFind = {
    subjectId,
    targetId: find.targetId ?? existing?.targetId ?? null,
    name: find.name?.trim() || existing?.name || subjectId,
    tier,
    earnedAt: find.at,
    marker: ORIONIDS_FOUND_MARKER,
    voucher: ORIONIDS_VOUCHER,
  }
  const hadMastery = (player.meteoriteMastery ?? 0) >= METEORITE_MASTERY_LEVEL
  const next = {
    ...player,
    orionidsFinds: { ...(player.orionidsFinds ?? {}), [subjectId]: record },
    meteoriteMastery: Math.max(player.meteoriteMastery ?? 0, METEORITE_MASTERY_LEVEL),
    badges: setBadge(player.badges, SPACETOBER_PEAK_BADGE, tier, find.at),
  } as T
  return { player: next, granted: record, masteryGranted: !hadMastery }
}

/** Fold already-earned Week and peak badges into the Spacetober set. */
export function syncSpacetoberSet(player: FindPlayer): FindPlayer {
  let badges = player.badges ?? {}
  const week = bestBadge(WSW_EVENT_IDS.map(id => badges[id]))
  if (week) badges = setBadge(badges, SPACETOBER_WEEK_BADGE, week.tier, week.earnedAt)
  const peak = bestBadge([
    badges[ORIONIDS_EVENT_ID],
    badges[SPACETOBER_PEAK_BADGE],
    ...Object.values(player.orionidsFinds ?? {}).map(find => ({
      eventId: SPACETOBER_PEAK_BADGE,
      tier: find.tier,
      earnedAt: find.earnedAt,
    })),
  ])
  if (peak) badges = setBadge(badges, SPACETOBER_PEAK_BADGE, peak.tier, peak.earnedAt)
  if (badges === player.badges) return player
  return { ...player, badges }
}

/** Backfill finds from saved planet classifications, then the badge set. */
export function reconcileOrionidsFinds(player: FindPlayer): FindPlayer {
  let next = player
  for (const classification of Object.values(player.tessClassifications ?? {})) {
    if (classification.verdict !== 'planet') continue
    const discovered = player.discoveredExoplanetTargets?.[classification.subjectId]
    next = grantOrionidsPlanetFind(next, {
      subjectId: classification.subjectId,
      targetId: discovered?.id ?? null,
      name: discovered?.name,
      at: classification.submittedAt,
    }).player
  }
  return syncSpacetoberSet(next)
}

export function sanitizeOrionidsFinds(raw: unknown): Record<string, OrionidsFind> {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {}
  const out: Record<string, OrionidsFind> = {}
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    const v = value as Partial<OrionidsFind> | null
    if (!v || typeof v !== 'object') continue
    if (v.tier !== 'gold' && v.tier !== 'silver') continue
    if (typeof v.earnedAt !== 'number' || !Number.isFinite(v.earnedAt)) continue
    if (v.marker !== ORIONIDS_FOUND_MARKER || v.voucher !== ORIONIDS_VOUCHER) continue
    const subjectId = typeof v.subjectId === 'string' && v.subjectId ? v.subjectId : key
    out[subjectId] = {
      subjectId,
      targetId: typeof v.targetId === 'string' ? v.targetId : null,
      name: typeof v.name === 'string' && v.name ? v.name : subjectId,
      tier: v.tier,
      earnedAt: v.earnedAt,
      marker: ORIONIDS_FOUND_MARKER,
      voucher: ORIONIDS_VOUCHER,
    }
  }
  return out
}

export function sanitizeMeteoriteMastery(raw: unknown): number {
  if (typeof raw !== 'number' || !Number.isFinite(raw)) return 0
  return Math.max(0, Math.floor(raw))
}

export function orionidsFindForTarget(
  finds: Record<string, OrionidsFind> | undefined,
  targetId: string,
): OrionidsFind | undefined {
  return Object.values(finds ?? {}).find(find => find.targetId === targetId || find.subjectId === targetId)
}

/** PocketBase record ids are 15 chars from [a-z0-9]. Stable so a replay is the same row. */
export function pocketBaseId(seed: string): string {
  let hash = 2166136261
  for (let i = 0; i < seed.length; i++) {
    hash ^= seed.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  const alphabet = 'abcdefghijklmnopqrstuvwxyz0123456789'
  let out = ''
  let n = hash >>> 0
  for (let i = 0; i < 15; i++) {
    out += alphabet[n % 36]
    n = Math.imul(n ^ (i + 1), 16777619) >>> 0
  }
  return out
}
