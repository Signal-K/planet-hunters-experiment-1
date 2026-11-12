import { describe, expect, it } from 'vitest'
import { CLIENT_SLOTS } from '@/lib/data/clients'
import type { GameState } from '@/lib/game-types'
import { CLIENT_SALE_DAILY_UNITS, applyClientSale, clientSaleOffer, mergeClientSales } from './client-sales'

const client = CLIENT_SLOTS[0]
const wanted = client.mineralPreferences[0]
const NOW = Date.parse('2026-11-12T10:00:00Z')
const state = (stash: Record<string, number>) => ({ player: { francs: 0, stash, researchStamps: {} } }) as unknown as GameState

describe('selling surplus to a client (SSL-734)', () => {
  it('opens at affinity level 3, only for what the client wants, above the Exchange price', () => {
    const s = state({ [wanted]: 30, ice: 5 })
    expect(clientSaleOffer(s.player, client.id, 2, NOW).unlocked).toBe(false)
    const offer = clientSaleOffer(s.player, client.id, 3, NOW)
    expect(offer.unlocked).toBe(true)
    expect(offer.rows.map(r => r.mineral)).toEqual([wanted])
    expect(offer.rows[0].price).toBeGreaterThan(offer.rows[0].exchange)
  })

  it('pays, takes the units from the silo, stamps an Exchange sale, and stops at the daily demand', () => {
    const level = 3
    const sold = applyClientSale(state({ [wanted]: 30 }), client.id, level, wanted, 25, NOW)
    expect(sold.player.stash?.[wanted]).toBe(30 - CLIENT_SALE_DAILY_UNITS)
    expect(sold.player.francs).toBeGreaterThan(0)
    expect(sold.player.researchStamps?.['2026-11-12']).toContain('exchange-sale')
    expect(applyClientSale(sold, client.id, level, wanted, 1, NOW)).toBe(sold)
    // A new day, new demand.
    expect(applyClientSale(sold, client.id, level, wanted, 1, NOW + 86_400_000).player.stash?.[wanted]).toBe(19)
    expect(applyClientSale(state({ [wanted]: 30 }), client.id, 2, wanted, 5, NOW).player.francs).toBe(0)
  })

  it('merges two saves without losing a sale', () => {
    expect(mergeClientSales({ a: { day: '2026-11-12', units: 3 } }, { a: { day: '2026-11-12', units: 5 }, b: { day: '2026-11-11', units: 1 } }))
      .toEqual({ a: { day: '2026-11-12', units: 5 }, b: { day: '2026-11-11', units: 1 } })
    expect(mergeClientSales({ a: { day: '2026-11-13', units: 1 } }, { a: { day: '2026-11-12', units: 9 } })).toEqual({ a: { day: '2026-11-13', units: 1 } })
  })
})
