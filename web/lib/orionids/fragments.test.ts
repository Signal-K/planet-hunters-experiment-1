import { describe, expect, it } from 'vitest'
import { FIREBALL_FRAGMENT_ID } from './fireball'
import {
  FRAGMENT_REDEEM_BATCH,
  FRAGMENT_REDEEM_RESEARCH,
  FRAGMENTS_PER_FIREBALL,
  addCaughtFragments,
  applyLaunchCatch,
  combineFragments,
  fragmentsFromSave,
  mergeFragments,
  redeemFragments,
  sanitizeFragments,
} from './fragments'

const local = (m: number, d: number, h: number) => new Date(2026, m - 1, d, h, 0, 0, 0).getTime()
const empty = {
  stash: {} as Record<string, number>,
  researchXP: 0,
  meteoriteMastery: 0,
  orionidsFragments: null as { caught: number; redeemed: number } | null,
}

describe('fragment ledger', () => {
  it('stores a launch catch in the stash and the count', () => {
    const next = applyLaunchCatch(empty, local(10, 20, 12))
    expect(next.orionidsFragments).toEqual({ caught: 2, redeemed: 0 })
    expect(next.stash?.orionid_debris).toBe(2)
    expect(applyLaunchCatch(empty, local(10, 14, 12))).toBe(empty)
  })

  it('redeems a batch for research and records mastery', () => {
    const held = addCaughtFragments(empty, 5, 'stash')
    const next = redeemFragments(held)
    expect(next.researchXP).toBe(FRAGMENT_REDEEM_RESEARCH)
    expect(next.orionidsFragments).toEqual({ caught: 5, redeemed: FRAGMENT_REDEEM_BATCH })
    expect(next.stash?.orionid_debris).toBe(5 - FRAGMENT_REDEEM_BATCH)
    expect(next.meteoriteMastery).toBe(1)
    const again = redeemFragments(next)
    expect(again.stash?.orionid_debris).toBe(5 - FRAGMENT_REDEEM_BATCH * 2)
    expect(again.orionidsFragments?.redeemed).toBe(FRAGMENT_REDEEM_BATCH * 2)
    expect(redeemFragments(again)).toBe(again)
  })

  it('combines 15 fragments into one fireball', () => {
    const held = addCaughtFragments(empty, FRAGMENTS_PER_FIREBALL, 'stash')
    const next = combineFragments(held)
    expect(next.stash?.orionid_debris).toBeUndefined()
    expect(next.stash?.[FIREBALL_FRAGMENT_ID]).toBe(1)
    expect(next.orionidsFragments?.caught).toBe(FRAGMENTS_PER_FIREBALL)
    expect(combineFragments(next)).toBe(next)
  })

  it('keeps an older night count when the ledger is behind', () => {
    expect(fragmentsFromSave({ caught: 2, redeemed: 0 }, 15)).toEqual({ caught: 15, redeemed: 0 })
    expect(fragmentsFromSave({ caught: 20, redeemed: 5 }, 4)).toEqual({ caught: 20, redeemed: 5 })
  })

  it('merges the higher count and never lets redeemed pass caught', () => {
    expect(sanitizeFragments({ caught: 4.8, redeemed: 9 })).toEqual({ caught: 4, redeemed: 4 })
    expect(mergeFragments({ caught: 3, redeemed: 1 }, { caught: 2, redeemed: 2 })).toEqual({ caught: 3, redeemed: 2 })
  })
})
