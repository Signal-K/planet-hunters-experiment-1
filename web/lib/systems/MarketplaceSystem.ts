// Marketplace panel logic: spot board, buying, and sell alerts.
// Selling lives in EconomySystem. Buying and alerts need the Exchange built.

import type { GameState } from '@/lib/game-types'
import { MINERAL_META, isArtifactMineralId } from '@/lib/data'
import { GEMINIDS_DEBRIS_PRESET, LEONIDS_DEBRIS_PRESET, debrisWindowStartMs } from '@/lib/data/sky-events'
import { sellUnitPrice, storageCapacity, storedUnits } from './EconomySystem'
import { addStamp } from '@/lib/research/stamps'

/** The Exchange charges a dealer margin over the spot (sell) price, so buying and re-selling never profits. */
export const BUY_MARKUP = 1.25
export const MAX_PRICE_ALERTS = 8

export interface PriceAlert {
  id: string
  mineralId: string
  /** Fires when the spot sell price is at or above this many francs. */
  target: number
  /** Set once the spot price reached the target. */
  firedAt?: number
}

export interface SpotQuote {
  id: string
  name: string
  /** What the player is paid per unit right now. */
  spot: number
  /** What the Exchange charges per unit. */
  ask: number
  held: number
}

type PricePlayer = Pick<GameState['player'], 'placed' | 'marketSupply' | 'marketSupplyUpdatedAt' | 'dailyEconomySnapshot' | 'researchPermanentBonuses'>

export function exchangeBuilt(player: Pick<GameState['player'], 'placed'>): boolean {
  return (player.placed ?? []).includes('market')
}

export function buyUnitPrice(mineralId: string, player: PricePlayer, clientId?: string, now: number = Date.now()): number {
  // The ask is set from the quote without the community research bonus (SSL-673).
  const spot = sellUnitPrice(mineralId, player, clientId, now).price
  if (spot <= 0) return 0
  return Math.max(spot + 1, Math.round(spot * BUY_MARKUP))
}

/** Leonids and Geminids stay off the board until their windows open. After that they stay listed so leftovers can sell. */
const QUEUED_SHOWER_PRESETS = [LEONIDS_DEBRIS_PRESET, GEMINIDS_DEBRIS_PRESET]

function showerListed(id: string, now: number): boolean {
  const preset = QUEUED_SHOWER_PRESETS.find(entry => entry.resourceId === id)
  if (!preset) return true
  return now >= debrisWindowStartMs(preset)
}

/** Every mineral with a market price, cheapest first, with what is held of it. */
export function spotBoard(player: PricePlayer & { stash?: Record<string, number> }, clientId?: string, now: number = Date.now()): SpotQuote[] {
  return Object.entries(MINERAL_META)
    .map(([id, meta]) => {
      const spot = sellUnitPrice(id, player, clientId, now).price
      return { id, name: meta.name, spot, ask: buyUnitPrice(id, player, clientId, now), held: player.stash?.[id] ?? 0 }
    })
    .filter(q => (q.spot > 0 && !isArtifactMineralId(q.id) && showerListed(q.id, now)) || (isArtifactMineralId(q.id) && q.held > 0))
    .sort((a, b) => a.spot - b.spot || a.name.localeCompare(b.name))
}

/** Why the player cannot buy `amount` of a mineral, or null when they can. */
export function buyBlocker(player: GameState['player'], mineralId: string, amount = 1, now: number = Date.now()): string | null {
  if (!MINERAL_META[mineralId]) return 'Not on the market'
  if (isArtifactMineralId(mineralId)) return 'Artifacts are protected research evidence'
  if (!exchangeBuilt(player)) return 'Build the Exchange to buy'
  const room = storageCapacity(player) - storedUnits(player.stash)
  if (room < amount) return storageCapacity(player) <= 0 ? 'Build a silo to store ore' : 'Silo is full'
  if (player.francs < buyUnitPrice(mineralId, player, player.lastClient, now) * amount) return 'Not enough francs'
  return null
}

export function applyBuyMinerals(s: GameState, mineralId: string, amount: number, now: number = Date.now()): GameState {
  const qty = Math.floor(amount)
  if (qty <= 0 || buyBlocker(s.player, mineralId, qty, now)) return s
  const cost = buyUnitPrice(mineralId, s.player, s.player.lastClient, now) * qty
  const stash = { ...(s.player.stash ?? {}), [mineralId]: (s.player.stash?.[mineralId] ?? 0) + qty }
  return { ...s, player: { ...s.player, francs: s.player.francs - cost, stash } }
}

export function applySetPriceAlert(s: GameState, mineralId: string, target: number): GameState {
  const price = Math.round(target)
  const alerts = s.player.priceAlerts ?? []
  if (!exchangeBuilt(s.player) || !MINERAL_META[mineralId] || !(price > 0)) return s
  // One alert per mineral: setting again moves the target and re-arms it.
  const others = alerts.filter(a => a.mineralId !== mineralId)
  if (others.length >= MAX_PRICE_ALERTS) return s
  return { ...s, player: addStamp({ ...s.player, priceAlerts: [...others, { id: `alert-${mineralId}`, mineralId, target: price }] }, 'price-alert', Date.now()) }
}

export function applyRemovePriceAlert(s: GameState, alertId: string): GameState {
  const alerts = s.player.priceAlerts ?? []
  if (!alerts.some(a => a.id === alertId)) return s
  return { ...s, player: { ...s.player, priceAlerts: alerts.filter(a => a.id !== alertId) } }
}

/** Alerts whose target the spot price has reached and that have not fired yet. */
export function dueAlerts(player: GameState['player'], now: number = Date.now()): PriceAlert[] {
  return (player.priceAlerts ?? []).filter(a => a.firedAt == null && sellUnitPrice(a.mineralId, player, player.lastClient, now).price >= a.target)
}

/** Marks due alerts as fired. Returns the same state when nothing is due so it is safe in an effect. */
export function applyFireDueAlerts(s: GameState, now: number = Date.now()): GameState {
  const due = new Set(dueAlerts(s.player, now).map(a => a.id))
  if (due.size === 0) return s
  return { ...s, player: { ...s.player, priceAlerts: (s.player.priceAlerts ?? []).map(a => due.has(a.id) ? { ...a, firedAt: now } : a) } }
}

export function firedAlertCount(player: Pick<GameState['player'], 'priceAlerts'>): number {
  return (player.priceAlerts ?? []).filter(a => a.firedAt != null).length
}
