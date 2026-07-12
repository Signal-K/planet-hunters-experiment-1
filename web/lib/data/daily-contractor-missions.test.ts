import { describe, expect, it } from 'vitest'
import { CONTRACTOR_SLOTS } from './contractors'
import { MINERAL_META } from './minerals'
import {
  affinityBonusSlots,
  BASE_DAILY_SLOTS_PER_CONTRACTOR,
  generateDailyContractorPool,
  MAX_AFFINITY_BONUS_SLOTS,
} from './daily-contractor-missions'

describe('affinityBonusSlots', () => {
  it('grants no bonus slots below one affinity level', () => {
    expect(affinityBonusSlots(0)).toBe(0)
    expect(affinityBonusSlots(4)).toBe(0)
  })

  it('grants one bonus slot per affinity level past the first', () => {
    expect(affinityBonusSlots(5)).toBe(1)
    expect(affinityBonusSlots(10)).toBe(2)
    expect(affinityBonusSlots(15)).toBe(3)
  })

  it('caps bonus slots at MAX_AFFINITY_BONUS_SLOTS', () => {
    expect(affinityBonusSlots(1000)).toBe(MAX_AFFINITY_BONUS_SLOTS)
  })
})

describe('generateDailyContractorPool', () => {
  it('gives each eligible contractor 3 base daily slots with no affinity history', () => {
    const missions = generateDailyContractorPool('2026-07-11', 20, CONTRACTOR_SLOTS, MINERAL_META, {})
    const eligible = CONTRACTOR_SLOTS.filter(c => c.unlockTier <= 4)
    for (const contractor of eligible) {
      const offers = missions.filter(m => m.contractor === contractor.id)
      expect(offers.length).toBe(BASE_DAILY_SLOTS_PER_CONTRACTOR)
    }
  })

  it('adds bonus slots for contractors with completed-job affinity history', () => {
    const contractor = CONTRACTOR_SLOTS.find(c => c.unlockTier === 1)!
    const missions = generateDailyContractorPool('2026-07-11', 20, CONTRACTOR_SLOTS, MINERAL_META, {
      [contractor.id]: 10,
    })
    const offers = missions.filter(m => m.contractor === contractor.id)
    expect(offers.length).toBe(BASE_DAILY_SLOTS_PER_CONTRACTOR + 2)
  })

  it('unlocks tier-5 contractors once missionsDone reaches the tier-5 threshold', () => {
    const tier5 = CONTRACTOR_SLOTS.find(c => c.unlockTier === 5)!
    const before = generateDailyContractorPool('2026-07-11', 11, CONTRACTOR_SLOTS, MINERAL_META, {})
    const after = generateDailyContractorPool('2026-07-11', 12, CONTRACTOR_SLOTS, MINERAL_META, {})
    expect(before.some(m => m.contractor === tier5.id)).toBe(false)
    expect(after.some(m => m.contractor === tier5.id)).toBe(true)
  })
})
