import { describe, expect, it } from 'vitest'
import type { GameState } from '@/lib/game-types'
import { applyFreeHaulDisposition, pickSpillForStore, storageCapacity, storedUnits } from './EconomySystem'

// SSL-845: a full silo never stops the player storing what they mine.
function full(haul: Record<string, number>): GameState {
  const stash: Record<string, number> = { iron: 24, cobalt: 10, nickel: 6 }
  for (const [id, n] of Object.entries(haul)) stash[id] = (stash[id] ?? 0) + n // the return leg already stashed the haul
  return { player: { francs: 0, placed: ['surface-silo'], subsurfaceBuilt: [], buildingLevels: {}, stash }, marketPrices: {} } as unknown as GameState
}

describe('storing a haul into a full silo', () => {
  it('keeps the whole new haul and sells the cheapest older ore to make room', () => {
    const s = full({ aluminium: 12 })
    const after = applyFreeHaulDisposition(s, { aluminium: 12 }, 'store', 0)
    expect(after.player.stash?.aluminium).toBe(12)
    expect(storedUnits(after.player.stash)).toBe(storageCapacity(after.player))
    expect(after.player.francs).toBeGreaterThan(0)
  })

  it('takes older stock first; only a haul bigger than the silo spills its own ore', () => {
    expect(storedUnitsOf(pickSpillForStore({ iron: 30, aluminium: 12 }, { aluminium: 12 }, 2))).toEqual({ fromHaul: 0, total: 2 })
    const big = pickSpillForStore({ iron: 5, aluminium: 50 }, { aluminium: 50 }, 15)
    expect(big.iron).toBe(5)
    expect(big.aluminium).toBe(10)
  })
})

function storedUnitsOf(spill: Record<string, number>) {
  return { fromHaul: spill.aluminium ?? 0, total: storedUnits(spill) }
}

describe('Cargo home sheet into a full silo', () => {
  it('lets the whole haul go to the silo and sells the cheapest older ore on settle', async () => {
    const { applyHomeSplit, siloRoomFor, defaultHomeSplit } = await import('./HomeDeliverySystem')
    const s = full({ aluminium: 12 })
    const room = siloRoomFor(s.player, { aluminium: 12 })
    expect(room.free).toBe(0)
    expect(room.limit).toBe(40)
    const split = defaultHomeSplit({ aluminium: 12 }, {}, room.limit)
    expect(split.aluminium.silo).toBe(12)
    const { state } = applyHomeSplit(s, split, 0)
    expect(state.player.stash?.aluminium).toBe(12)
    expect(storedUnits(state.player.stash)).toBe(40)
    expect(state.player.homeSettlement?.siloed).toEqual({ aluminium: 12 })
  })
})
