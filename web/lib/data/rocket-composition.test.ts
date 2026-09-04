import { describe, expect, it } from 'vitest'
import { ROCKET_COMPOSITIONS, rocketCompositionForId } from './rocket-composition'

describe('canonical rocket compositions', () => {
  it.each(Object.values(ROCKET_COMPOSITIONS))('%s has stages, boosters, and a payload', composition => {
    expect(composition.stages.length).toBeGreaterThanOrEqual(1)
    expect(composition.boosters.count).toBeGreaterThan(0)
    expect(composition.payload.kind).toBe('mining-laser')
    expect(composition.stages[0].rooms.some(room => room.role === 'storage')).toBe(true)
    expect(composition.stages[0].recovery).toBe('dismantle')
  })

  it('falls back to Explorer for an unknown legacy id', () => {
    expect(rocketCompositionForId('legacy-unresolved').rocketId).toBe('explorer')
  })
})
