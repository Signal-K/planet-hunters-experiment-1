import type { Mission } from '@/lib/data'

/**
 * The common construction kind is intentionally retained while the persisted
 * game state is migrated. It lets the existing construction record represent
 * a refinery without inventing a second, parallel building type.
 */
export const OFFWORLD_REFINERY_STRUCTURE_KIND = 'refinery' as const

export type SiteRightKind = 'owned' | 'leased'

/** The minimum location authority needed to install player infrastructure. */
export interface OffworldSiteRight {
  targetId: string
  siteId: string
  kind: SiteRightKind
  /** An owned deed does not expire. A lease is active while this is in future. */
  expiresAt?: number
}

/**
 * A location-specific refinery record. This is deliberately independent of
 * `Player` until the site-rights persistence migration lands: callers can
 * create and verify the same record on the client, in a scheduled job, or on
 * the game backend without importing React or mutable game state.
 */
export interface OffworldRefineryDeployment {
  owner: 'player'
  structureKind: typeof OFFWORLD_REFINERY_STRUCTURE_KIND
  targetId: string
  siteId: string
  rightKind: SiteRightKind
  state: 'under-construction' | 'operational'
  startedAt: number
  completesAt: number
}

export type OffworldRefineryPlanResult =
  | { ok: true; deployment: OffworldRefineryDeployment }
  | { ok: false; reason: 'not-refinery-mission' | 'missing-site-right' | 'expired-site-lease' }

export function hasActiveSiteRight(right: OffworldSiteRight | undefined, now = Date.now()): boolean {
  if (!right) return false
  return right.kind === 'owned' || (right.expiresAt ?? 0) > now
}

/**
 * Make the location and ownership promises of the own-program refinery
 * explicit. Material availability and launch range stay with the mission
 * engine, which already validates `mission.requires` before this point.
 */
export function planOffworldRefinery(
  mission: Mission,
  siteRight: OffworldSiteRight | undefined,
  now = Date.now(),
): OffworldRefineryPlanResult {
  if (mission.construction?.structureKind !== OFFWORLD_REFINERY_STRUCTURE_KIND) {
    return { ok: false, reason: 'not-refinery-mission' }
  }
  if (!siteRight) return { ok: false, reason: 'missing-site-right' }
  if (!hasActiveSiteRight(siteRight, now)) return { ok: false, reason: 'expired-site-lease' }

  const buildTimeMs = mission.construction.buildTimeMs
  return {
    ok: true,
    deployment: {
      owner: 'player',
      structureKind: OFFWORLD_REFINERY_STRUCTURE_KIND,
      targetId: siteRight.targetId,
      siteId: siteRight.siteId,
      rightKind: siteRight.kind,
      state: 'under-construction',
      startedAt: now,
      completesAt: now + buildTimeMs,
    },
  }
}

export function resolveOffworldRefinery(
  deployment: OffworldRefineryDeployment,
  now = Date.now(),
): OffworldRefineryDeployment {
  if (deployment.state === 'operational' || now < deployment.completesAt) return deployment
  return { ...deployment, state: 'operational' }
}
