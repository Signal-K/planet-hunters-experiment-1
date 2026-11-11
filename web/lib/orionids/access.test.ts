import { describe, expect, it } from 'vitest'
import { buyResearchItem } from '@/lib/research/marketplace'
import { ORIONIDS_ARCHIVE_ITEM_ID, orionidsRunAvailable, orionidsSkyEarned, orionidsSkyOn } from './access'

const IN_EVENT = Date.parse('2026-10-29T12:00:00Z')
const AFTER = Date.parse('2026-11-12T12:00:00Z')

describe('Orionids access after the event (cycle 9)', () => {
  it('is open to everyone during the window', () => {
    expect(orionidsRunAvailable({}, IN_EVENT)).toBe(true)
  })

  it('is closed afterwards for players who never took part', () => {
    expect(orionidsRunAvailable({}, AFTER)).toBe(false)
    expect(orionidsRunAvailable({ orionidsEventStage: 0, orionidsFragments: { caught: 0, redeemed: 0 } }, AFTER)).toBe(false)
  })

  it('stays open for anyone who started it during the event', () => {
    expect(orionidsRunAvailable({ orionidsFragments: { caught: 3, redeemed: 0 } }, AFTER)).toBe(true)
    expect(orionidsRunAvailable({ orionidsEventStage: 2 }, AFTER)).toBe(true)
    expect(orionidsRunAvailable({ badges: { 'orionids-2026': { eventId: 'orionids-2026', tier: 'silver', earnedAt: 1 } } }, AFTER)).toBe(true)
  })

  it('reopens once, for research currency, from the marketplace', () => {
    const rich = { researchUniversalFragments: 25, researchPurchases: {}, researchCosmetics: [], researchPermanentBonuses: {} }
    const bought = buyResearchItem(rich, ORIONIDS_ARCHIVE_ITEM_ID)
    expect(bought.researchUniversalFragments).toBe(5)
    expect(orionidsRunAvailable(bought, AFTER)).toBe(true)
    expect(bought.researchPermanentBonuses).toEqual({})
    expect(buyResearchItem(bought, ORIONIDS_ARCHIVE_ITEM_ID)).toBe(bought)
    expect(buyResearchItem({ ...rich, researchUniversalFragments: 5 }, ORIONIDS_ARCHIVE_ITEM_ID).researchPurchases).toEqual({})
  })

  it('offers the sky cosmetic only once earned, and keeps it off until turned on', () => {
    expect(orionidsSkyEarned({})).toBe(false)
    expect(orionidsSkyOn({ orionidsSkyEffect: true })).toBe(false)
    const did = { orionidsFragments: { caught: 4, redeemed: 0 } }
    expect(orionidsSkyEarned(did)).toBe(true)
    expect(orionidsSkyOn(did)).toBe(false)
    expect(orionidsSkyOn({ ...did, orionidsSkyEffect: true })).toBe(true)
  })
})
