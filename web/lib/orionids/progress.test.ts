import { describe, expect, it } from 'vitest'
import { detectOrionidsProgress } from './progress'

describe('Orionids progress repair', () => {
  it('recognises persisted fragment attempts and completed event runs', () => {
    expect(detectOrionidsProgress({
      orionidsFragments: { caught: 4, redeemed: 0 },
      orionidsRunBaseline: 0,
      orionidsNightCatches: null,
      orionidsFinds: {},
      badges: {},
      completedMissions: [{ id: 'self-directed-orionids-night-run', title: 'Orionids shower run', completedAt: 100 }],
    })).toMatchObject({ attempted: true, completed: true, surfaceCompleted: false, completionAt: 100 })
  })

  it('does not convert an ordinary hydrogen mission into event credit', () => {
    expect(detectOrionidsProgress({
      orionidsFragments: { caught: 0, redeemed: 0 },
      orionidsRunBaseline: null,
      orionidsNightCatches: null,
      orionidsFinds: {},
      badges: {},
      completedMissions: [{ id: 'freeops-bulk-run', title: 'Hydrogen haul', completedAt: 100 }],
    }).attempted).toBe(false)
  })

  it('preserves the completed tier for the surface observation', () => {
    expect(detectOrionidsProgress({
      orionidsFragments: { caught: 20, redeemed: 0 },
      orionidsRunBaseline: 0,
      orionidsNightCatches: null,
      orionidsFinds: {},
      badges: {},
      completedMissions: [{ id: 'self-directed-orionids-surface-research', title: 'Orionids surface observation', completedAt: 200 }],
    }).surfaceCompleted).toBe(true)
  })
})
