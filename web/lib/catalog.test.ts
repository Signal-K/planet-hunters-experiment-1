import { describe, it, expect } from 'vitest'
import { toTarget, toMission, toPart } from './catalog'

describe('Landnam Catalog Mapping', () => {
  it('maps a raw database record to a Target object', () => {
    const raw = {
      slug: 'tess-451',
      name: 'TESS-451',
      body_type: 'planet',
      orbit: 3,
      difficulty: 'Medium',
      minerals: '["Iron", "Silica"]'
    }
    const target = toTarget(raw)
    expect(target.id).toBe('tess-451')
    expect(target.minerals).toEqual(['Iron', 'Silica'])
  })

  it('handles empty or malformed minerals JSON in toTarget', () => {
    const raw = { slug: 'empty', minerals: '' }
    const target = toTarget(raw)
    expect(target.minerals).toEqual([])
  })

  it('maps a raw mission record with payout and requirements', () => {
    const raw = {
      slug: 'm1',
      title: 'First Flight',
      payout_francs: 5000,
      requires_minerals: '{"Water": 10}'
    }
    const mission = toMission(raw)
    expect(mission.id).toBe('m1')
    expect(mission.payout.francs).toBe(5000)
    expect(mission.requires.minerals).toEqual({ Water: 10 })
  })

  it('maps a raw part record with stats', () => {
    const raw = {
      slug: 'drill-t1',
      name: 'Basic Drill',
      tier: 1,
      drill_rate: 1.5
    }
    const part = toPart(raw)
    expect(part.id).toBe('drill-t1')
    expect(part.rate).toBe(1.5)
  })

  it('unlocks tier-1 and tier-2 parts regardless of locked flag', () => {
    const raw = { slug: 'hull-mk1', name: 'Hull MK1', tier: 1, locked: true }
    const unlocked = toPart(raw)
    expect(unlocked.locked).toBe(false)
  })

  it('respects locked flag for tier-3+ parts', () => {
    const raw = { slug: 'hull-mk3', name: 'Hull MK3', tier: 4, locked: true }
    const locked = toPart(raw)
    expect(locked.locked).toBe(true)
  })
})
