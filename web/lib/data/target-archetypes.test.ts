import { describe, it, expect } from 'vitest'
import {
  orbitBandLabel,
  mineralsForArchetype,
  RARE_TIER_MIN_ORBIT,
  EXOTIC_TIER_MIN_ORBIT,
} from './target-archetypes'

describe('orbitBandLabel (STS-544)', () => {
  it('names each band at its real gate', () => {
    expect(orbitBandLabel(1)).toBe('Near-Earth · common minerals')
    expect(orbitBandLabel(RARE_TIER_MIN_ORBIT)).toBe('Mid belt · rare minerals')
    expect(orbitBandLabel(EXOTIC_TIER_MIN_ORBIT)).toBe('Deep belt · exotic minerals')
  })

  // The label is the player-facing promise; if it ever drifts from what the
  // archetype pools actually unlock, the copy is lying about the economy.
  it('changes band exactly where the mineral pool widens', () => {
    const below = mineralsForArchetype('M', RARE_TIER_MIN_ORBIT - 1)
    const atRare = mineralsForArchetype('M', RARE_TIER_MIN_ORBIT)
    const atExotic = mineralsForArchetype('M', EXOTIC_TIER_MIN_ORBIT)

    expect(atRare.length).toBeGreaterThan(below.length)
    expect(atExotic.length).toBeGreaterThan(atRare.length)
    expect(orbitBandLabel(RARE_TIER_MIN_ORBIT - 1)).not.toBe(orbitBandLabel(RARE_TIER_MIN_ORBIT))
    expect(orbitBandLabel(EXOTIC_TIER_MIN_ORBIT - 1)).not.toBe(orbitBandLabel(EXOTIC_TIER_MIN_ORBIT))
  })
})
