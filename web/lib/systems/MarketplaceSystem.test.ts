import { describe, expect, it } from 'vitest'
import type { GameState } from '@/lib/game-types'
import { normalizeAndRepair } from '@/lib/game-state'
import { applyBuyMinerals, applyFireDueAlerts, applyRemovePriceAlert, applySetPriceAlert, buyBlocker, buyUnitPrice, dueAlerts, spotBoard } from './MarketplaceSystem'
import { sellUnitPrice } from './EconomySystem'

function state(patch: Partial<GameState['player']> = {}): GameState {
  const s = normalizeAndRepair({ screen: 'market', player: {} } as never)
  return { ...s, player: { ...s.player, francs: 50_000_000, placed: ['launchpad', 'market', 'surface-silo'], stash: {}, ...patch } }
}

describe('marketplace', () => {
  it('lists every priced mineral, and the ask is always above the spot', () => {
    const s = state({ stash: { iron: 3 } })
    const board = spotBoard(s.player)
    expect(board.length).toBeGreaterThan(3)
    expect(board.find(q => q.id === 'iron')?.held).toBe(3)
    for (const q of board.filter(q => q.spot > 0)) expect(q.ask).toBeGreaterThan(q.spot)
  })

  it('hides Leonid and Geminid rows until their showers start', () => {
    const october = spotBoard(state().player, undefined, Date.parse('2026-10-20T12:00:00Z'))
    expect(october.find(q => q.id === 'leonid_debris')).toBeUndefined()
    expect(october.find(q => q.id === 'geminid_debris')).toBeUndefined()
    expect(october.find(q => q.id === 'orionid_debris')).toBeUndefined()
    const later = spotBoard(state().player, undefined, Date.parse('2026-12-13T00:00:00Z'))
    expect(later.find(q => q.id === 'leonid_debris')).toBeUndefined()
    expect(later.find(q => q.id === 'geminid_debris')).toBeUndefined()
  })

  it('buying costs the ask, adds to the stash and never lets buy-then-sell profit', () => {
    const s = state()
    const ask = buyUnitPrice('iron', s.player)
    const next = applyBuyMinerals(s, 'iron', 2)
    expect(next.player.francs).toBe(50_000_000 - ask * 2)
    expect(next.player.stash?.iron).toBe(2)
    expect(sellUnitPrice('iron', next.player).price * 2).toBeLessThan(ask * 2)
  })

  it('refuses to buy without the Exchange, without room, or without francs', () => {
    expect(buyBlocker(state({ placed: ['launchpad', 'surface-silo'] }).player, 'iron')).toMatch(/Exchange/)
    expect(buyBlocker(state({ placed: ['launchpad', 'market'] }).player, 'iron')).toMatch(/silo/i)
    expect(buyBlocker(state({ francs: 1 }).player, 'iron')).toMatch(/francs/i)
    const poor = state({ francs: 1 })
    expect(applyBuyMinerals(poor, 'iron', 1)).toBe(poor)
  })

  it('sets one alert per mineral, needs the Exchange, and fires once the spot reaches the target', () => {
    const s = state()
    const spot = sellUnitPrice('iron', s.player).price
    expect(applySetPriceAlert(state({ placed: ['launchpad'] }), 'iron', spot).player.priceAlerts).toBeUndefined()
    const high = applySetPriceAlert(s, 'iron', spot + 100)
    expect(dueAlerts(high.player)).toHaveLength(0)
    expect(applyFireDueAlerts(high)).toBe(high)
    const moved = applySetPriceAlert(high, 'iron', spot)
    expect(moved.player.priceAlerts).toHaveLength(1)
    const fired = applyFireDueAlerts(moved, 1234)
    expect(fired.player.priceAlerts?.[0].firedAt).toBe(1234)
    expect(dueAlerts(fired.player)).toHaveLength(0)
    expect(applyRemovePriceAlert(fired, 'alert-iron').player.priceAlerts).toEqual([])
  })
})
