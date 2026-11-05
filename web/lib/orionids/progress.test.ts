import { describe, expect, it } from 'vitest'
import { detectOrionidsProgress } from './progress'

describe('Orionids progress repair', () => {

  it('credits a hydrogen haul finished while the event card still started a Free Run', () => {
    const base = { orionidsFragments: { caught: 0, redeemed: 0 }, orionidsRunBaseline: null, orionidsNightCatches: null, orionidsFinds: {}, badges: {} }
    const during = Date.UTC(2026, 9, 20, 12)
    expect(detectOrionidsProgress({ ...base, completedMissions: [{ id: 'freeops-bulk-run', title: 'Hydrogen haul', completedAt: during }] }).attempted).toBe(true)
  })

  it('does not credit hydrogen hauls outside that window or other minerals', () => {
    const base = { orionidsFragments: { caught: 0, redeemed: 0 }, orionidsRunBaseline: null, orionidsNightCatches: null, orionidsFinds: {}, badges: {} }
    expect(detectOrionidsProgress({ ...base, completedMissions: [{ id: 'freeops-bulk-run', title: 'Hydrogen haul', completedAt: Date.UTC(2026, 9, 18, 12) }] }).attempted).toBe(false)
    expect(detectOrionidsProgress({ ...base, completedMissions: [{ id: 'freeops-bulk-run', title: 'Hydrogen haul', completedAt: Date.UTC(2026, 9, 25, 12) }] }).attempted).toBe(false)
    expect(detectOrionidsProgress({ ...base, completedMissions: [{ id: 'freeops-bulk-run', title: 'Copper haul', completedAt: Date.UTC(2026, 9, 20, 12) }] }).attempted).toBe(false)
  })
})
