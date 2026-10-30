import { describe, expect, it } from 'vitest'
import { buyResearchItem, convertResearchFragments, researchItemCost, researchItemById } from './marketplace'

describe('research marketplace', () => {
  it('converts regular fragments without changing the weekly badge', () => {
    const player = { researchFragments: 25, researchUniversalFragments: 1, badges: { 'community-research-2026-10-19': { tier: 'gold' as const } } }
    const converted = convertResearchFragments(player)
    expect(converted.researchFragments).toBe(5)
    expect(converted.researchUniversalFragments).toBe(3)
    expect(converted.badges).toBe(player.badges)
  })

  it('raises bonus costs and applies permanent purchases', () => {
    const item = researchItemById('exchange-calibration')!
    const first = buyResearchItem({ researchUniversalFragments: researchItemCost({}, item), researchPurchases: {}, researchPermanentBonuses: {}, researchCosmetics: [], researchFragments: 0 }, item.id)
    expect(first.researchUniversalFragments).toBe(0)
    expect(first.researchPermanentBonuses).toEqual({ 'exchange-calibration': 1 })
    expect(researchItemCost(first, item)).toBeGreaterThan(item.baseCost)
    expect(buyResearchItem(first, item.id).researchUniversalFragments).toBe(0)
  })
})
