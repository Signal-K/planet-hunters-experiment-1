/**
 * Predefined-site rights in client territory.
 *
 * This replaces both free client territory claims and solo access permits:
 * clients own territory, while a player explicitly purchases or leases a
 * narrowly-scoped build and/or mine right at a predefined site.
 */

import {
  recordSiteDeedRevenue,
  type TreasuryState,
} from './TreasurySystem'

export type SiteRightMode = 'purchase' | 'lease'
export type SiteRightActivity = 'build' | 'mine'

export interface ClientTerritory {
  id: string
  clientId: string
  targetId: string
  predefinedSiteIds: string[]
}

export interface PredefinedSiteRightOffer {
  mode: SiteRightMode
  activities: SiteRightActivity[]
  deedPriceFrancs: number
  /** Required for a lease and absent for a permanent purchase. */
  leaseDurationMs?: number
}

export interface PredefinedSite {
  id: string
  targetId: string
  clientId: string
  offers: PredefinedSiteRightOffer[]
}

export interface SiteRight {
  id: string
  playerId: string
  clientId: string
  targetId: string
  siteId: string
  mode: SiteRightMode
  activities: SiteRightActivity[]
  acquiredAt: number
  expiresAt?: number
}

export interface SiteRightsState {
  territories: Record<string, ClientTerritory>
  rights: Record<string, SiteRight>
}

export interface AcquireSiteRightRequest {
  rightId: string
  ledgerEntryId: string
  playerId: string
  mode: SiteRightMode
  activities: SiteRightActivity[]
  acquiredAt: number
}

export interface AcquireSiteRightResult {
  siteRights: SiteRightsState
  treasury: TreasuryState
  /** The integration layer deducts this from the player only when acquired. */
  playerDebitFrancs: number
  acquired: boolean
}

export function createSiteRightsState(
  territories: ClientTerritory[] = []
): SiteRightsState {
  return {
    territories: Object.fromEntries(
      territories
        .filter(validTerritory)
        .map(territory => [territory.id, { ...territory, predefinedSiteIds: [...territory.predefinedSiteIds] }])
    ),
    rights: {},
  }
}

export function siteIsInClientTerritory(
  state: SiteRightsState,
  site: Pick<PredefinedSite, 'id' | 'targetId' | 'clientId'>
): boolean {
  return Object.values(state.territories).some(territory =>
    territory.clientId === site.clientId
    && territory.targetId === site.targetId
    && territory.predefinedSiteIds.includes(site.id)
  )
}

export function rightIsActive(right: SiteRight, at: number): boolean {
  return right.mode === 'purchase' || (right.expiresAt !== undefined && at < right.expiresAt)
}

export function playerHasSiteRight(
  state: SiteRightsState,
  playerId: string,
  siteId: string,
  activity: SiteRightActivity,
  at: number
): boolean {
  return Object.values(state.rights).some(right =>
    right.playerId === playerId
    && right.siteId === siteId
    && right.activities.includes(activity)
    && rightIsActive(right, at)
  )
}

export function acquireSiteRight(
  state: SiteRightsState,
  treasury: TreasuryState,
  site: PredefinedSite,
  request: AcquireSiteRightRequest
): AcquireSiteRightResult {
  const offer = site.offers.find(candidate =>
    candidate.mode === request.mode && sameActivities(candidate.activities, request.activities)
  )
  if (
    !validSite(site)
    || !validRequest(request)
    || !offer
    || !validOffer(offer)
    || !siteIsInClientTerritory(state, site)
    || state.rights[request.rightId]
    || hasEquivalentActiveRight(state, request.playerId, site.id, request.activities, request.acquiredAt)
  ) return { siteRights: state, treasury, playerDebitFrancs: 0, acquired: false }

  const revenueTreasury = recordSiteDeedRevenue(treasury, {
    entryId: request.ledgerEntryId,
    siteRightId: request.rightId,
    playerId: request.playerId,
    siteId: site.id,
    clientId: site.clientId,
    amountFrancs: offer.deedPriceFrancs,
    occurredAt: request.acquiredAt,
  })
  if (revenueTreasury === treasury) {
    return { siteRights: state, treasury, playerDebitFrancs: 0, acquired: false }
  }

  // `validOffer` already requires this, but retaining the guard here keeps the
  // stored right safe when this module is called with runtime data.
  let expiresAt: number | undefined
  if (request.mode === 'lease') {
    const leaseDurationMs = offer.leaseDurationMs
    if (leaseDurationMs === undefined) {
      return { siteRights: state, treasury, playerDebitFrancs: 0, acquired: false }
    }
    expiresAt = request.acquiredAt + leaseDurationMs
  }
  const right: SiteRight = {
    id: request.rightId,
    playerId: request.playerId,
    clientId: site.clientId,
    targetId: site.targetId,
    siteId: site.id,
    mode: request.mode,
    activities: [...request.activities],
    acquiredAt: request.acquiredAt,
    ...(expiresAt === undefined ? {} : { expiresAt }),
  }
  return {
    siteRights: { ...state, rights: { ...state.rights, [right.id]: right } },
    treasury: revenueTreasury,
    playerDebitFrancs: offer.deedPriceFrancs,
    acquired: true,
  }
}

function hasEquivalentActiveRight(
  state: SiteRightsState,
  playerId: string,
  siteId: string,
  activities: SiteRightActivity[],
  at: number
): boolean {
  return Object.values(state.rights).some(right =>
    right.playerId === playerId
    && right.siteId === siteId
    && sameActivities(right.activities, activities)
    && rightIsActive(right, at)
  )
}

function sameActivities(left: SiteRightActivity[], right: SiteRightActivity[]): boolean {
  return left.length === right.length
    && left.every(activity => right.includes(activity))
    && new Set(left).size === left.length
    && new Set(right).size === right.length
}

function validTerritory(territory: ClientTerritory): boolean {
  return validId(territory.id)
    && validId(territory.clientId)
    && validId(territory.targetId)
    && territory.predefinedSiteIds.length > 0
    && territory.predefinedSiteIds.every(validId)
}

function validSite(site: PredefinedSite): boolean {
  return validId(site.id)
    && validId(site.targetId)
    && validId(site.clientId)
    && site.offers.length > 0
}

function validRequest(request: AcquireSiteRightRequest): boolean {
  return validId(request.rightId)
    && validId(request.ledgerEntryId)
    && validId(request.playerId)
    && validTimestamp(request.acquiredAt)
    && request.activities.length > 0
    && request.activities.every(activity => activity === 'build' || activity === 'mine')
    && new Set(request.activities).size === request.activities.length
}

function validOffer(offer: PredefinedSiteRightOffer): boolean {
  const leaseDurationMs = offer.leaseDurationMs
  return offer.deedPriceFrancs > 0
    && Number.isSafeInteger(offer.deedPriceFrancs)
    && offer.activities.length > 0
    && offer.activities.every(activity => activity === 'build' || activity === 'mine')
    && new Set(offer.activities).size === offer.activities.length
    && (offer.mode === 'purchase'
      ? leaseDurationMs === undefined
      : typeof leaseDurationMs === 'number'
        && Number.isSafeInteger(leaseDurationMs)
        && leaseDurationMs > 0)
}

function validId(value: string): boolean {
  return value.trim().length > 0
}

function validTimestamp(value: number): boolean {
  return Number.isSafeInteger(value) && value >= 0
}
