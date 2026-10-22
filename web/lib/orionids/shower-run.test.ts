import { describe, expect, it } from 'vitest'
import { ORIONIDS_FRAGMENT_GOAL } from '@/lib/data/missions'
import {
  settleShowerRun,
  showerRunCatches,
  showerRunFilled,
  showerRunPayout,
  startShowerRun,
  withoutShowerFragments,
} from './shower-run'

const player = (caught: number, baseline?: number | null, francs = 100) => ({
  francs,
  orionidsFragments: { caught, redeemed: 0 },
  orionidsRunBaseline: baseline,
})

describe('orionids shower run count', () => {
  it('counts catches since the run was accepted, not the lifetime ledger', () => {
    expect(showerRunCatches(player(30, 28))).toBe(2)
    expect(showerRunFilled(player(30, 28))).toBe(false)
    expect(showerRunFilled(player(28 + ORIONIDS_FRAGMENT_GOAL, 28))).toBe(true)
  })

  it('starts a new run at zero even after the ledger passed the goal', () => {
    const veteran = player(ORIONIDS_FRAGMENT_GOAL + 5, null)
    expect(showerRunFilled(veteran)).toBe(true)
    const next = startShowerRun(veteran)
    expect(showerRunCatches(next)).toBe(0)
    expect(showerRunFilled(next)).toBe(false)
  })

  it('reads a run saved without a baseline from the ledger, as before', () => {
    expect(showerRunCatches(player(7, undefined))).toBe(7)
  })
})

describe('orionids shower run payout', () => {
  it('pays once when the order is filled and not before', () => {
    const early = player(1, 0)
    expect(settleShowerRun(early, 6)).toBe(early)

    const filled = player(ORIONIDS_FRAGMENT_GOAL, 0)
    const paid = settleShowerRun(filled, 6)
    expect(paid.francs).toBe(100 + showerRunPayout(6))
    expect(showerRunPayout(6)).toBeGreaterThan(0)
    // The same collect run twice finds the order empty, so it cannot pay twice.
    expect(settleShowerRun(paid, 6)).toBe(paid)
  })

  it('keeps the fragments out of the haul that gets sold', () => {
    expect(withoutShowerFragments({ iron: 3, orionid_debris: 20 })).toEqual({ iron: 3 })
  })
})
