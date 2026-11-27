import { describe, expect, it } from 'vitest'
import type { GameState } from '@/lib/game-types'
import { ANNEX_SLOTS, homeCenter, unplacedAnnexKinds, validateBaseSite } from '@/lib/scene/base-site'
import { applyBuildGroundTelescope } from './EconomySystem'

// SSL-843: owned structures with no place on the Base wait in the Unplaced tray and go into annex slots.
function state(placed: string[], placementPlots: Record<string, number> = {}, francs = 5_000_000): GameState {
  return { player: { francs, placed, placementPlots, freeOperations: true } } as unknown as GameState
}

const [WEST, GATE] = ANNEX_SLOTS

describe('annex slots', () => {
  it('the site map with annex slots stays sound', () => {
    expect(validateBaseSite()).toEqual([])
  })

  it('a ground telescope built from the Data hub lands in the tray, not on a slot', () => {
    const built = applyBuildGroundTelescope(state(['launchpad', 'control-station'], { launchpad: 0, 'control-station': 3 }))
    expect(built.player.placed).toContain('ground-telescope')
    expect(unplacedAnnexKinds(built.player)).toEqual(['ground-telescope'])
  })

  it('the camera frames a structure standing on an annex slot', () => {
    const without = homeCenter(['launchpad', 'market'], 1000)
    const withScope = homeCenter(['launchpad', 'market', 'ground-telescope'], 1000, null, { 'ground-telescope': WEST.plot })
    expect(withScope).toBeLessThan(without)
  })

  // SSL-802: a second telescope for the second slot, ₣2M each, and no third.
  it('builds a second telescope into the tray, then stops at one per slot', () => {
    const one = applyBuildGroundTelescope(state(['ground-telescope'], { 'ground-telescope': WEST.plot }, 5_000_000))
    expect(one.player.placed).toContain('ground-telescope-2')
    expect(one.player.francs).toBe(3_000_000)
    expect(unplacedAnnexKinds(one.player)).toEqual(['ground-telescope-2'])
    const two = applyBuildGroundTelescope({ ...one, player: { ...one.player, placementPlots: { ...one.player.placementPlots, 'ground-telescope-2': GATE.plot } } })
    expect(two).toBe(applyBuildGroundTelescope(two))
  })
})
