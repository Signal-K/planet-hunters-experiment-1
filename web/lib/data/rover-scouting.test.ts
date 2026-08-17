import { describe, expect, it } from 'vitest'
import { deriveRoverScoutingResult } from './rover-scouting'
import type { Target } from '@/lib/data'

const target = {
  id: 'test-target',
  name: 'Test Target',
  type: 'planet',
  orbit: 1,
  minerals: ['iron', 'copper', 'gold'],
} as Target

describe('deriveRoverScoutingResult', () => {
  it('turns a vein classification into a deterministic, target-local deposit signal', () => {
    expect(deriveRoverScoutingResult(target, 'vein')).toEqual({
      terrain: 'vein',
      mineral: 'copper',
      depositLabel: 'MINERAL VEIN',
      cargoBonus: 3,
    })
  })

  it('keeps ordinary terrain observations useful without claiming a vein bonus', () => {
    expect(deriveRoverScoutingResult(target, 'sand')).toMatchObject({
      mineral: 'gold',
      cargoBonus: 1,
      depositLabel: 'SAND DRIFT',
    })
  })
})
