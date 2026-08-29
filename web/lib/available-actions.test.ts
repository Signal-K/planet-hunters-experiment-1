import { describe, expect, it } from 'vitest'
import { DEFAULT_STATE } from './game-state'
import { academyAffinityClientCount, installableSkillNodes, unplacedUnlockedStructures } from './available-actions'

describe('player availability summaries', () => {
  it('reports an Academy path only after two clients reach affinity level 2', () => {
    expect(academyAffinityClientCount({ clientMissions: { helios: 5, arcturus: 4 } })).toBe(1)
    expect(academyAffinityClientCount({ clientMissions: { helios: 5, arcturus: 5 } })).toBe(2)
  })

  it('keeps the build list aligned with the placement unlock gate', () => {
    const player = { ...DEFAULT_STATE.player, academyResearched: true, placed: ['launchpad'] }
    expect(unplacedUnlockedStructures(player).map(structure => structure.id)).toContain('astronaut-academy')
    expect(unplacedUnlockedStructures(DEFAULT_STATE.player)).toEqual([])
  })

  it('reports only skill nodes that can be installed with current points', () => {
    const player = { ...DEFAULT_STATE.player, freeOperations: true, skillPoints: 1 }
    expect(installableSkillNodes(player).map(node => node.id)).toEqual([
      'laser-charge-1',
      'cargo-slot-1',
      'ship-customizer-1',
    ])
  })
})
