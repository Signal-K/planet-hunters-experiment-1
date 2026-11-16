import { describe, expect, it } from 'vitest'
import type { GameState } from '@/lib/game-types'
import { ANNEX_SLOTS, homeCenter, placedAnnex, unplacedAnnexKinds, validateBaseSite } from '@/lib/scene/base-site'
import { applyBuildGroundTelescope, applyPlaceAnnex } from './EconomySystem'

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

  it('placing it is free and takes it out of the tray', () => {
    const before = state(['launchpad', 'ground-telescope'], { launchpad: 0 })
    const after = applyPlaceAnnex(before, 'ground-telescope', GATE.plot)
    expect(after.player.francs).toBe(before.player.francs)
    expect(after.player.placementPlots['ground-telescope']).toBe(GATE.plot)
    expect(unplacedAnnexKinds(after.player)).toEqual([])
    expect(placedAnnex(after.player).get(GATE.plot)).toBe('ground-telescope')
  })

  it('refuses an unowned kind, a main structure, an unknown slot and a taken slot', () => {
    expect(applyPlaceAnnex(state(['launchpad']), 'ground-telescope', WEST.plot).player.placementPlots).toEqual({})
    const owned = state(['launchpad', 'ground-telescope'], { launchpad: 0 })
    expect(applyPlaceAnnex(owned, 'launchpad', WEST.plot)).toBe(owned)
    expect(applyPlaceAnnex(owned, 'ground-telescope', 0)).toBe(owned)
    const onWest = applyPlaceAnnex(owned, 'ground-telescope', WEST.plot)
    expect(applyPlaceAnnex(onWest, 'ground-telescope', WEST.plot)).toBe(onWest)
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
    const placed = applyPlaceAnnex(one, 'ground-telescope-2', GATE.plot)
    expect(placedAnnex(placed.player).get(GATE.plot)).toBe('ground-telescope-2')
    expect(applyBuildGroundTelescope(placed)).toBe(placed)
  })
})
