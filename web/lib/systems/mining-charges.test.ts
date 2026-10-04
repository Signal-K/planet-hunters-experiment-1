import { describe, expect, it } from 'vitest'
import { miningNeedsRecharge, unitsStillNeeded } from './mining-charges'

describe('mining recharge', () => {
  it('counts only the units the order still needs', () => {
    expect(unitsStillNeeded({ platinum: 5 }, { platinum: 3 })).toBe(2)
    expect(unitsStillNeeded({ platinum: 5, iron: 1 }, { platinum: 5 })).toBe(1)
  })

  it('offers a recharge when 4 charges cannot reliably finish 2 platinum', () => {
    // Staging playtest: starter order 3/5 with 4 charges left, return disabled.
    expect(miningNeedsRecharge(4, 2)).toBe(true)
  })

  it('offers a recharge when the laser is empty and the order is open', () => {
    expect(miningNeedsRecharge(0, 2)).toBe(true)
  })

  it('keeps firing while the magazine can still cover the remainder', () => {
    expect(miningNeedsRecharge(20, 2)).toBe(false)
    expect(miningNeedsRecharge(4, 0)).toBe(false)
  })
})
