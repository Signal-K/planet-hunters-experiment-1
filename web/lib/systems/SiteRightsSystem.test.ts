import { describe, expect, it } from 'vitest'
import { createTreasuryState } from './TreasurySystem'
import {
  acquireSiteRight,
  createSiteRightsState,
  playerHasSiteRight,
  rightIsActive,
  siteIsInClientTerritory,
  type PredefinedSite,
} from './SiteRightsSystem'

const NOW = 1_000_000
const SITE: PredefinedSite = {
  id: 'mars-arcadia-a',
  targetId: 'mars',
  clientId: 'helios',
  offers: [
    { mode: 'purchase', activities: ['build', 'mine'], deedPriceFrancs: 500 },
    { mode: 'lease', activities: ['mine'], deedPriceFrancs: 120, leaseDurationMs: 10_000 },
  ],
}

function clientTerritoryState() {
  return createSiteRightsState([{
    id: 'helios-mars',
    clientId: 'helios',
    targetId: 'mars',
    predefinedSiteIds: ['mars-arcadia-a'],
  }])
}

describe('predefined client territory', () => {
  it('only accepts sites declared in matching client territory', () => {
    const state = clientTerritoryState()
    expect(siteIsInClientTerritory(state, SITE)).toBe(true)
    expect(siteIsInClientTerritory(state, { ...SITE, clientId: 'aurora' })).toBe(false)
    expect(siteIsInClientTerritory(state, { ...SITE, id: 'mars-arcadia-b' })).toBe(false)
  })
})

describe('site deeds', () => {
  it('purchases explicit build-and-mine rights and credits the treasury', () => {
    const state = clientTerritoryState()
    const treasury = createTreasuryState()
    const result = acquireSiteRight(state, treasury, SITE, {
      rightId: 'right-1',
      ledgerEntryId: 'ledger-deed-1',
      playerId: 'player-1',
      mode: 'purchase',
      activities: ['build', 'mine'],
      acquiredAt: NOW,
    })

    expect(result).toMatchObject({ acquired: true, playerDebitFrancs: 500 })
    expect(result.treasury.balanceFrancs).toBe(500)
    expect(result.treasury.ledger[0]).toMatchObject({
      kind: 'site-deed-revenue', referenceId: 'right-1', direction: 'credit',
    })
    expect(playerHasSiteRight(result.siteRights, 'player-1', SITE.id, 'build', NOW + 1)).toBe(true)
    expect(playerHasSiteRight(result.siteRights, 'player-1', SITE.id, 'mine', NOW + 1)).toBe(true)
  })

  it('supports a time-bounded mine lease without implying a permanent settlement', () => {
    const result = acquireSiteRight(clientTerritoryState(), createTreasuryState(), SITE, {
      rightId: 'right-lease-1',
      ledgerEntryId: 'ledger-deed-lease-1',
      playerId: 'player-1',
      mode: 'lease',
      activities: ['mine'],
      acquiredAt: NOW,
    })
    const right = result.siteRights.rights['right-lease-1']

    expect(result.playerDebitFrancs).toBe(120)
    expect(right).toMatchObject({ mode: 'lease', expiresAt: NOW + 10_000 })
    expect(rightIsActive(right, NOW + 9_999)).toBe(true)
    expect(playerHasSiteRight(result.siteRights, 'player-1', SITE.id, 'mine', NOW + 10_000)).toBe(false)
    expect(playerHasSiteRight(result.siteRights, 'player-1', SITE.id, 'build', NOW + 1)).toBe(false)
  })

  it('rejects missing territory, duplicate active deeds, and duplicate ids without charging a player', () => {
    const state = clientTerritoryState()
    const initial = acquireSiteRight(state, createTreasuryState(), SITE, {
      rightId: 'right-1', ledgerEntryId: 'ledger-deed-1', playerId: 'player-1',
      mode: 'purchase', activities: ['build', 'mine'], acquiredAt: NOW,
    })
    const duplicate = acquireSiteRight(initial.siteRights, initial.treasury, SITE, {
      rightId: 'right-2', ledgerEntryId: 'ledger-deed-2', playerId: 'player-1',
      mode: 'purchase', activities: ['build', 'mine'], acquiredAt: NOW + 1,
    })
    const missingTerritory = acquireSiteRight(createSiteRightsState(), createTreasuryState(), SITE, {
      rightId: 'right-3', ledgerEntryId: 'ledger-deed-3', playerId: 'player-1',
      mode: 'purchase', activities: ['build', 'mine'], acquiredAt: NOW,
    })

    expect(duplicate).toEqual({
      siteRights: initial.siteRights, treasury: initial.treasury, playerDebitFrancs: 0, acquired: false,
    })
    expect(missingTerritory).toEqual({
      siteRights: createSiteRightsState(), treasury: createTreasuryState(), playerDebitFrancs: 0, acquired: false,
    })
  })
})
