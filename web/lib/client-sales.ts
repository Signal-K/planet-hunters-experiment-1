// SSL-734 (Liam, 1 Nov): a research element for cycle 9. Once a player reaches a high enough affinity with a client,
// they can sell surplus mined minerals straight to that client. Defaults chosen here (decision note, to confirm):
//   - Unlocks at affinity level 3 (ten jobs for that client), on affinity alone: no research node.
//   - The client buys only what it wants (its mineral preferences): that is its demand list.
//   - It pays 10% over what the same client-preferred sale would fetch at the Exchange.
//   - Up to 10 units a day per client, so the Exchange stays the main market.
//   - Sold from the client's card on the Mission Board's Clients tab. A sale is an Exchange-sale research stamp and
//     does not push the market price down (it never reaches the open market).

import { CLIENT_SLOTS } from '@/lib/data/clients'
import { stampDayKey, addStamp } from '@/lib/research/stamps'
import { sellUnitPrice } from '@/lib/systems/EconomySystem'
import type { GameState, Player } from '@/lib/game-types'

export const CLIENT_SALE_LEVEL = 3
export const CLIENT_SALE_PREMIUM = 0.1
export const CLIENT_SALE_DAILY_UNITS = 10

export type ClientSales = NonNullable<Player['clientSales']>

type SalePlayer = Pick<Player, 'stash' | 'clientSales' | 'placed' | 'marketSupply' | 'marketSupplyUpdatedAt' | 'dailyEconomySnapshot' | 'researchPermanentBonuses' | 'communityBonus'>

export interface ClientSaleRow { mineral: string; held: number; price: number; exchange: number }
export interface ClientSaleOffer {
  unlocked: boolean
  /** Units this client still takes today. */
  left: number
  rows: ClientSaleRow[]
}

export function soldToday(sales: ClientSales | undefined, clientId: string, now: number): number {
  const record = sales?.[clientId]
  return record && record.day === stampDayKey(now) ? record.units : 0
}

/** What a client takes off the player's hands today, and at what price. */
export function clientSaleOffer(player: SalePlayer, clientId: string, level: number, now: number = Date.now()): ClientSaleOffer {
  const client = CLIENT_SLOTS.find(c => c.id === clientId)
  const unlocked = !!client && level >= CLIENT_SALE_LEVEL
  const left = Math.max(0, CLIENT_SALE_DAILY_UNITS - soldToday(player.clientSales, clientId, now))
  const rows = (client?.mineralPreferences ?? [])
    .filter(mineral => (player.stash?.[mineral] ?? 0) > 0)
    .map(mineral => {
      const exchange = sellUnitPrice(mineral, player, clientId, now).price
      return { mineral, held: player.stash?.[mineral] ?? 0, exchange, price: Math.round(exchange * (1 + CLIENT_SALE_PREMIUM)) }
    })
    .filter(row => row.price > 0)
  return { unlocked, left, rows }
}

/** Sell up to `amount` of a mineral to a client. Returns the same state when nothing can be sold. */
export function applyClientSale(s: GameState, clientId: string, level: number, mineral: string, amount: number, now: number = Date.now()): GameState {
  const offer = clientSaleOffer(s.player, clientId, level, now)
  const row = offer.rows.find(r => r.mineral === mineral)
  const units = Math.min(Math.floor(amount), row?.held ?? 0, offer.left)
  if (!offer.unlocked || !row || units <= 0) return s
  const stash = { ...(s.player.stash ?? {}) }
  stash[mineral] = row.held - units
  if (stash[mineral] <= 0) delete stash[mineral]
  const clientSales = { ...(s.player.clientSales ?? {}), [clientId]: { day: stampDayKey(now), units: soldToday(s.player.clientSales, clientId, now) + units } }
  const player = addStamp({ ...s.player, stash, clientSales, francs: s.player.francs + row.price * units }, 'exchange-sale', now)
  return { ...s, player }
}

/** Two saves: the later day wins; on the same day the larger count (sales only add up). */
export function mergeClientSales(a: ClientSales | undefined, b: ClientSales | undefined): ClientSales | undefined {
  if (!a) return b
  if (!b) return a
  const out: ClientSales = { ...a }
  for (const [id, rec] of Object.entries(b)) {
    const cur = out[id]
    out[id] = !cur || rec.day > cur.day ? rec : rec.day === cur.day ? { day: rec.day, units: Math.max(rec.units, cur.units) } : cur
  }
  return out
}
