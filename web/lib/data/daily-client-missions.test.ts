import { describe, expect, it } from 'vitest'
import { CLIENT_SLOTS } from './clients'
import { MINERAL_META } from './minerals'
import {
  affinityBonusSlots,
  BASE_DAILY_SLOTS_PER_CLIENT,
  generateDailyClientPool,
  MAX_AFFINITY_BONUS_SLOTS,
} from './daily-client-missions'

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

describe('generateDailyClientPool', () => {
  it('gives each eligible client 3 base daily slots with no affinity history', () => {
    const missions = generateDailyClientPool('2026-07-11', 20, CLIENT_SLOTS, MINERAL_META, {})
    const eligible = CLIENT_SLOTS.filter(c => c.unlockTier <= 4)
    for (const client of eligible) {
      const offers = missions.filter(m => m.client === client.id)
      expect(offers.length).toBe(BASE_DAILY_SLOTS_PER_CLIENT)
    }
  })

  it('adds bonus slots for clients with completed-job affinity history', () => {
    const client = CLIENT_SLOTS.find(c => c.unlockTier === 1)!
    const missions = generateDailyClientPool('2026-07-11', 20, CLIENT_SLOTS, MINERAL_META, {
      [client.id]: 10,
    })
    const offers = missions.filter(m => m.client === client.id)
    expect(offers.length).toBe(BASE_DAILY_SLOTS_PER_CLIENT + 2)
  })

  it('unlocks tier-5 clients once missionsDone reaches the tier-5 threshold', () => {
    const tier5 = CLIENT_SLOTS.find(c => c.unlockTier === 5)!
    const before = generateDailyClientPool('2026-07-11', 11, CLIENT_SLOTS, MINERAL_META, {})
    const after = generateDailyClientPool('2026-07-11', 12, CLIENT_SLOTS, MINERAL_META, {})
    expect(before.some(m => m.client === tier5.id)).toBe(false)
    expect(after.some(m => m.client === tier5.id)).toBe(true)
  })
})
