import { describe, it, expect } from 'vitest'
import { missionDifficultyLabel, missionPayoutTier } from './mission-tiers'
import { MISSIONS } from './missions'
import type { Mission } from './types'

const base: Mission = {
  id: 'test', title: 'Test', brief: '', client: 'atlas-aggregate', tag: 'STARTER', difficulty: 'L1',
  locked: false, sequence: 1, targetId: 'bennu',
  requires: { minerals: {}, cargo_min: 0, drill_tier: 1, max_orbit: 3 },
  payout: { francs: 1, affinity: 0 },
}

describe('missionDifficultyLabel', () => {
  it('names the grades', () => {
    expect(missionDifficultyLabel('L1')).toBe('Routine')
    expect(missionDifficultyLabel('L2')).toBe('Demanding')
    expect(missionDifficultyLabel('L3')).toBe('Hazardous')
  })

  it('passes an unknown grade through rather than blanking the badge', () => {
    expect(missionDifficultyLabel('L9')).toBe('L9')
  })
})

describe('missionPayoutTier', () => {
  it('buckets generated missions off their template multiplier', () => {
    // starter-bulk 1.0 → Standard, metal-prospect 2.25 → Elevated,
    // command-reserve 3.5 → High-value.
    expect(missionPayoutTier(base)).toBe('Standard')
    expect(missionPayoutTier({ ...base, tag: 'PROSPECT' })).toBe('Elevated')
    expect(missionPayoutTier({ ...base, tag: 'COMMAND' })).toBe('High-value')
  })

  it('takes the strongest template when a tag maps to several', () => {
    // BULK spans 1.15 (freeops-bulk-run) and 1.35 (volatile-bulk) — neither
    // crosses 1.5, so the tier must stay Standard rather than flip on which
    // template happened to be found first.
    expect(missionPayoutTier({ ...base, tag: 'BULK' })).toBe('Standard')
  })

  it('falls back to the difficulty grade for authored missions with no template', () => {
    expect(missionPayoutTier({ ...base, tag: 'TRANSPORT', difficulty: 'L1' })).toBe('Standard')
    expect(missionPayoutTier({ ...base, tag: 'TRANSPORT', difficulty: 'L2' })).toBe('Elevated')
    expect(missionPayoutTier({ ...base, tag: 'TRANSPORT', difficulty: 'L3' })).toBe('High-value')
  })

  it('resolves a tier for every catalog mission', () => {
    for (const mission of MISSIONS) {
      expect(['Standard', 'Elevated', 'High-value']).toContain(missionPayoutTier(mission))
      expect(missionDifficultyLabel(mission.difficulty).length).toBeGreaterThan(0)
    }
  })
})
