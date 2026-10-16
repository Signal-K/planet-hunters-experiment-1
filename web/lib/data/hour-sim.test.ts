import { describe, expect, it } from 'vitest'
import { generateMissions, generateFreeOpsMissions, generateSelfDirectedMiningPool } from './missions'
import { PARTS } from './parts'
import { TARGETS, feasibleTargetsFor } from './targets'

// SSL-611: the hour path is missions 0 to 20. At every step the board must offer something the unlocked parts can fly.
describe('hour path has no dead end', () => {
  const board = [...generateMissions(), ...generateFreeOpsMissions(), ...generateSelfDirectedMiningPool()]

  for (let done = 0; done <= 20; done++) {
    it(`after ${done} missions the board has a flyable client contract and a flyable own run`, () => {
      const unlocked = <T extends { locked?: boolean; missionsRequired?: number }>(parts: T[]) => parts.filter(p => !p.locked && (p.missionsRequired ?? 0) <= done)
      const parts = { chassis: unlocked(PARTS.chassis), propulsion: unlocked(PARTS.propulsion), drill: unlocked(PARTS.drill) }
      const flyable = board.filter(m => !m.locked && feasibleTargetsFor(m, TARGETS, parts, done, done >= 3, [], 1).length > 0)
      expect(flyable.filter(m => m.client).length).toBeGreaterThanOrEqual(3)
      expect(flyable.filter(m => !m.client).length).toBeGreaterThanOrEqual(2)
    })
  }
})
