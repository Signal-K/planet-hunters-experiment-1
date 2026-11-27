import { describe, expect, it } from 'vitest'
import type { GameState } from '@/lib/game-types'
import { applyFreeHaulStore, storageCapacity, storedUnits } from './EconomySystem'

// Free mining only stores: a full silo leaves the overflow behind and never pays francs.
function full(haul: Record<string, number>): GameState {
  const stash: Record<string, number> = { iron: 24, cobalt: 10, nickel: 6 }
  for (const [id, n] of Object.entries(haul)) stash[id] = (stash[id] ?? 0) + n // the return leg already stashed the haul
  return { player: { francs: 0, placed: ['surface-silo'], stash }, marketPrices: {} } as unknown as GameState
}

describe('storing a haul into a full silo', () => {
  it('leaves the overflow behind and pays nothing', () => {
    const s = full({ aluminium: 12 })
    const after = applyFreeHaulStore(s, { aluminium: 12 })
    expect(storedUnits(after.player.stash)).toBe(storageCapacity(after.player))
    expect(after.player.stash?.aluminium ?? 0).toBe(0)
    expect(after.player.francs).toBe(0)
  })

  it('changes nothing while the haul fits', () => {
    const s = { player: { francs: 0, placed: ['surface-silo'], stash: { iron: 3 } } } as unknown as GameState
    expect(applyFreeHaulStore(s, { iron: 3 })).toBe(s)
  })
})

describe('Cargo home sheet into a full silo', () => {
  it('has no room, so the default split leaves the haul behind', async () => {
    const { applyHomeSplit, siloRoomFor, defaultHomeSplit } = await import('./HomeDeliverySystem')
    const s = full({ aluminium: 12 })
    const room = siloRoomFor(s.player, { aluminium: 12 })
    expect(room.free).toBe(0)
    const split = defaultHomeSplit({ aluminium: 12 }, {}, room.free)
    expect(split.aluminium.silo).toBe(0)
    const { state } = applyHomeSplit(s, split, { aluminium: 12 })
    expect(state.player.stash?.aluminium ?? 0).toBe(0)
    expect(state.player.homeSettlement?.left).toEqual({ aluminium: 12 })
  })
})
