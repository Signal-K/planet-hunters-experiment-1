import { describe, expect, it } from 'vitest'
import { isProtectedEventReward } from './rewards'

describe('protected event rewards', () => {
  it('protects shower debris and fireball catches from cargo drops', () => {
    expect(isProtectedEventReward('orionid_debris')).toBe(true)
    expect(isProtectedEventReward('fireball_fragment')).toBe(true)
    expect(isProtectedEventReward('iron')).toBe(false)
  })
})
