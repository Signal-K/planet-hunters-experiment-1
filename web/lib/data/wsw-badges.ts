// World Space Week 2026 mission-type badges (SSL-475/491/497).
//
// WSW runs 4-10 Oct 2026, official theme "Rocket Revolution". WSW publishes no
// global category list, so the mission type -> sky event mapping below is OUR
// OWN, derived in docs/design/wsw-badges-inspiration.md. One small badge per
// mission type: gold when the mission is completed during WSW, silver after,
// nothing before (same rule as the sky-event badges in sky-events.ts).

import type { Mission } from './types'
import type { Player } from '@/lib/game-types'
import { badgeTierFor, type BadgeTier, type PlayerBadge } from './sky-events'

export type WswMissionType =
  | 'onboarding-relay'
  | 'mining-free-ops'
  | 'rover-surface-ops'
  | 'satellite-survey'
  | 'citizen-science'
  | 'construction-launch'

/** Colour tone, resolved to an existing `--ln-*` token in SkyBadgeRow.module.css. */
export type WswTone = 'blue' | 'sky' | 'green' | 'crimson' | 'dim' | 'ink'

export interface WswBadgeDef {
  type: WswMissionType
  /** Key in `player.badges`. */
  badgeId: string
  name: string
  /** Existing sky event this category belongs to (our own mapping). */
  eventId: string
  tone: WswTone
}

/** Space Week window, UTC. Same days as the Rocket Revolution event. */
export const WSW_EVENT_ID = 'rocket-revolution-2026'

export const WSW_BADGES: ReadonlyArray<WswBadgeDef> = [
  { type: 'onboarding-relay', badgeId: 'wsw-2026-onboarding-relay', name: 'First Relay', eventId: 'rocket-revolution-2026', tone: 'blue' },
  { type: 'mining-free-ops', badgeId: 'wsw-2026-mining-free-ops', name: 'Debris Miner', eventId: 'draconids-2026', tone: 'green' },
  { type: 'rover-surface-ops', badgeId: 'wsw-2026-rover-surface-ops', name: 'Surface Rover', eventId: 'rocket-revolution-2026', tone: 'dim' },
  { type: 'satellite-survey', badgeId: 'wsw-2026-satellite-survey', name: 'Orbital Survey', eventId: 'new-moon-hunt-2026-10', tone: 'sky' },
  { type: 'citizen-science', badgeId: 'wsw-2026-citizen-science', name: 'Sky Observer', eventId: 'saturn-night-2026', tone: 'crimson' },
  { type: 'construction-launch', badgeId: 'wsw-2026-construction-launch', name: 'Launch Builder', eventId: 'rocket-revolution-2026', tone: 'ink' },
]

export function getWswBadge(badgeId: string): WswBadgeDef | undefined {
  return WSW_BADGES.find(def => def.badgeId === badgeId)
}

export function wswBadgeFor(type: WswMissionType): WswBadgeDef {
  return WSW_BADGES.find(def => def.type === type)!
}

/** Tier for a mission-type badge: gold during WSW, silver after, null before. */
export function wswBadgeTier(at: Date | number): BadgeTier | null {
  return badgeTierFor(WSW_EVENT_ID, at)
}

/** Classifies a completed mission into one of our six WSW categories. */
export function wswMissionTypeFor(mission: Mission | null | undefined, freeOperations: boolean): WswMissionType {
  if (mission?.construction) return 'construction-launch'
  const payload = mission?.payload?.type
  if (payload === 'rover') return 'rover-surface-ops'
  if (payload === 'satellite' || payload === 'deep-space-survey') return 'satellite-survey'
  return freeOperations ? 'mining-free-ops' : 'onboarding-relay'
}

/** Idempotent grant; never downgrades gold, upgrades silver to gold. */
export function grantWswBadge<T extends Pick<Player, 'badges'>>(
  player: T,
  type: WswMissionType,
  at: Date | number,
): { player: T; granted: PlayerBadge | null } {
  const tier = wswBadgeTier(at)
  if (!tier) return { player, granted: null }
  const { badgeId } = wswBadgeFor(type)
  const existing = player.badges?.[badgeId]
  if (existing && (existing.tier === 'gold' || tier === 'silver')) return { player, granted: null }
  const badge: PlayerBadge = { eventId: badgeId, tier, earnedAt: at instanceof Date ? at.getTime() : at }
  return { player: { ...player, badges: { ...(player.badges ?? {}), [badgeId]: badge } }, granted: badge }
}

/** Display name for any badge key: a sky event or a WSW mission-type badge. */
export function badgeDisplayName(badgeId: string, eventName?: string): string | undefined {
  return eventName ?? getWswBadge(badgeId)?.name
}
