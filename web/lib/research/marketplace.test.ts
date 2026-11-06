import { describe, expect, it } from 'vitest'
import { communityRangeBonus } from '@/lib/launchpad/rocketBuilder'
import { buyResearchItem, communityBonusRate, convertResearchFragments, permanentResearchSaleRate, researchItemCost, researchItemById, withCommunityBonus } from './marketplace'

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

describe('community goal reward (SSL-685)', () => {
  const nov = Date.UTC(2026, 10, 10)
  const server = { month: '2026-11', reachedAt: nov, bonusUntil: Date.UTC(2026, 11, 1), bonusPct: 3, fuelPct: 7 }

  it('records the reward only once the server reports the goal reached', () => {
    const p: Parameters<typeof withCommunityBonus>[0] = {}
    expect(withCommunityBonus(p, { ...server, reachedAt: null, bonusUntil: null })).toBe(p)
    const earned = withCommunityBonus(p, server)
    expect(earned.communityBonus).toEqual({ month: '2026-11', salePct: 3, fuelPct: 7, until: server.bonusUntil })
    expect(withCommunityBonus(earned, server)).toBe(earned)
  })

  it('adds +3% to Exchange sales and +7% fuel until the month ends', () => {
    const player = withCommunityBonus<Parameters<typeof withCommunityBonus>[0]>({}, server)
    expect(communityBonusRate(player, nov)).toEqual({ sale: 0.03, fuel: 0.07 })
    expect(permanentResearchSaleRate(player, nov)).toBeCloseTo(0.03)
    expect(communityBonusRate(player, Date.UTC(2026, 11, 1))).toEqual({ sale: 0, fuel: 0 })
    expect(permanentResearchSaleRate({ ...player, researchPermanentBonuses: { 'exchange-calibration': 1 } }, nov)).toBeCloseTo(0.05)
  })

  it('turns the fuel share into whole extra orbits, at least one', () => {
    expect(communityRangeBonus(5, 0.07)).toBe(1)
    expect(communityRangeBonus(9, 0.07)).toBe(1)
    expect(communityRangeBonus(20, 0.07)).toBe(2)
    expect(communityRangeBonus(5, 0)).toBe(0)
    expect(communityRangeBonus(0, 0.07)).toBe(0)
  })
})
