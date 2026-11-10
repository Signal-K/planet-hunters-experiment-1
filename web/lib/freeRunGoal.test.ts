import { describe, expect, it } from 'vitest'
import { applyFreeRunGoal, clampGoalAmount, maxGoalAmount } from './freeRunGoal'
import type { Mission, MineralMeta } from '@/lib/data/types'

const minerals = {
  nickel: { name: 'Nickel', sym: 'Ni', color: '#aaa', price: 10, rarity: 'common', constructionUse: '', laserAccess: 1 },
  gold: { name: 'Gold', sym: 'Au', color: '#fc0', price: 90, rarity: 'rare', constructionUse: '', laserAccess: 2 },
  spark: { name: 'Fragment', sym: 'F', color: '#fff', price: 0, rarity: 'common', constructionUse: '', laserAccess: 1, cargoUnits: 0 },
} as Record<string, MineralMeta>
const mission = { id: 'free', requires: { minerals: { nickel: 1 }, cargo_min: 1, drill_tier: 1, max_orbit: 2 }, payout: { francs: 0, affinity: 0 } } as unknown as Mission

describe('free run goal', () => {
  it('swaps in the chosen ore, amount and drill tier', () => {
    const next = applyFreeRunGoal(mission, { missionId: 'free', mineral: 'gold', amount: 4 }, minerals)
    expect(next.requires.minerals).toEqual({ gold: 4 })
    expect(next.requires.cargo_min).toBe(4)
    expect(next.requires.drill_tier).toBe(2)
  })
  it('leaves other missions and unknown ores alone', () => {
    expect(applyFreeRunGoal(mission, { missionId: 'other', mineral: 'gold', amount: 4 }, minerals)).toBe(mission)
    expect(applyFreeRunGoal(mission, { missionId: 'free', mineral: 'nope', amount: 4 }, minerals)).toBe(mission)
  })
  it('caps the amount at what the hold carries', () => {
    expect(maxGoalAmount(minerals.nickel, 6)).toBe(6)
    expect(maxGoalAmount(minerals.spark, 6)).toBe(0)
    expect(clampGoalAmount(40, minerals.nickel, 6)).toBe(6)
    expect(clampGoalAmount(0, minerals.nickel, 6)).toBe(1)
  })
})
