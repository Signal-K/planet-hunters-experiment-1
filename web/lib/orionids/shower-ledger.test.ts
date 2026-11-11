import { describe, expect, it } from 'vitest'
import { ORIONIDS_FRAGMENT_GOAL, generateSelfDirectedMiningPool, showerRunMission } from '@/lib/data/missions'
import { isFreeHaulMission } from '@/lib/data/mission-primers'
import { mergeShowerLedgers, showerLedger, addShowerCatches, showerRunBaseline } from './shower-ledger'
import { settleShowerRun, showerRunCatches, showerRunFilled, showerRunPayout, startShowerRun, withoutShowerFragments } from './shower-run'

const L = 'leonids-2026'
const O = 'orionids-2026'
const G = 'geminids-2026'
const base = { francs: 100, orionidsFragments: { caught: 0, redeemed: 0 }, orionidsRunBaseline: null as number | null, showerFragments: undefined, showerRunBaselines: undefined }

describe('per-shower fragment ledger', () => {
  it('keeps each shower in its own ledger', () => {
    let p: typeof base = base
    p = addShowerCatches(p, O, 5)
    p = addShowerCatches(p, L, 3)
    expect(showerLedger(p, O).caught).toBe(5)
    expect(showerLedger(p, L).caught).toBe(3)
    expect(showerLedger(p, G).caught).toBe(0)
    expect(p.orionidsFragments.caught).toBe(5)
  })

  it('a Leonid run counts only Leonid fragments from accept', () => {
    // A veteran with 40 Orionid catches starts a Leonid run at zero, and Orionid catches never fill it.
    let p = addShowerCatches(base, O, 40)
    p = startShowerRun(p, L)
    expect(showerRunCatches(p, L)).toBe(0)
    p = addShowerCatches(p, O, ORIONIDS_FRAGMENT_GOAL)
    expect(showerRunCatches(p, L)).toBe(0)
    expect(showerRunFilled(p, L)).toBe(false)
    p = addShowerCatches(p, L, ORIONIDS_FRAGMENT_GOAL)
    expect(showerRunFilled(p, L)).toBe(true)
    // The Orionid run, started separately, is not filled by the Leonid catches.
    expect(showerRunBaseline(p, O)).toBe(0)
  })

  it('leaves the Orionid run unchanged when another shower starts', () => {
    let p = addShowerCatches(base, O, 10)
    p = startShowerRun(p, O)
    p = startShowerRun(p, L)
    expect(p.orionidsRunBaseline).toBe(10)
    expect(showerRunCatches(p, O)).toBe(0)
  })

  it('pays once per shower and resets only that shower', () => {
    let p = startShowerRun(base, L)
    p = addShowerCatches(p, L, ORIONIDS_FRAGMENT_GOAL)
    const paid = settleShowerRun(p, 6, L)
    expect(paid.francs).toBe(100 + showerRunPayout(6, L))
    expect(showerRunPayout(6, L)).toBeGreaterThan(0)
    expect(settleShowerRun(paid, 6, L)).toBe(paid)
    expect(showerLedger(paid, L).caught).toBe(ORIONIDS_FRAGMENT_GOAL)
  })

  it('keeps only the run shower fragments out of the sold haul', () => {
    expect(withoutShowerFragments({ iron: 3, leonid_debris: 20, orionid_debris: 4 }, L)).toEqual({ iron: 3, orionid_debris: 4 })
    expect(withoutShowerFragments({ iron: 3, orionid_debris: 20 })).toEqual({ iron: 3 })
  })

  it('reads a save without per-shower fields as before', () => {
    expect(showerLedger({ orionidsFragments: { caught: 7, redeemed: 2 } }, O)).toEqual({ caught: 7, redeemed: 2 })
    expect(showerLedger({ orionidsFragments: { caught: 7, redeemed: 2 } }, L)).toEqual({ caught: 0, redeemed: 0 })
  })

  it('merges two saves, counts only moving up', () => {
    const merged = mergeShowerLedgers({ [L]: { caught: 4, redeemed: 1 } }, { [L]: { caught: 6, redeemed: 0 }, [G]: { caught: 2, redeemed: 0 } })
    expect(merged).toEqual({ [L]: { caught: 6, redeemed: 1 }, [G]: { caught: 2, redeemed: 0 } })
    expect(mergeShowerLedgers(undefined, undefined)).toBeUndefined()
  })
})

describe('shower run missions', () => {
  it('each shower has its own run, field and fragment', () => {
    const leonids = showerRunMission(L)
    expect(leonids.id).toBe('self-directed-leonids-shower-run')
    expect(leonids.targetId).toBe('leonids-shower-field')
    expect(showerRunMission(O).id).toBe('self-directed-orionids-night-run')
    expect(leonids.brief).toContain('Leonid')
  })

  it('offers a shower run only while that shower is open', () => {
    const during = Date.parse('2026-11-17T12:00:00Z')
    const before = Date.parse('2026-11-05T12:00:00Z')
    expect(generateSelfDirectedMiningPool(during).some(m => m.id === 'self-directed-leonids-shower-run')).toBe(true)
    expect(generateSelfDirectedMiningPool(before).some(m => m.id === 'self-directed-leonids-shower-run')).toBe(false)
    expect(generateSelfDirectedMiningPool(during).some(m => m.id === 'self-directed-geminids-shower-run')).toBe(false)
  })

  it('is event evidence, not an ordinary haul', () => {
    expect(isFreeHaulMission(showerRunMission(L), { leonid_debris: 20 })).toBe(false)
  })
})
