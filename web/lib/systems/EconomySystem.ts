// Pure state-transition functions for the economy system.
// Covers: sell minerals, refinery queue, launchpad upgrade.

import type { GameState } from '@/lib/game-types'
import type { RefineryRecipe } from '@/lib/data'
import { MINERAL_META } from '@/lib/data'

// Sell to open market (raw): ~80% of market price — see [[Economy and Minerals]].
export const OPEN_MARKET_SELL_RATE = 0.8
// Market price fluctuates based on supply — selling excess repeatedly causes
// a price dip, capped so a mineral never sells for less than 40% of its
// (already 80%-discounted) reference price.
const SUPPLY_DIP_PER_UNIT = 0.01
const MAX_SUPPLY_DIP = 0.6

export function supplyDipMultiplier(unitsSold: number): number {
  return Math.max(1 - MAX_SUPPLY_DIP, 1 - unitsSold * SUPPLY_DIP_PER_UNIT)
}

// Effective open-market unit price after the raw-sale discount and any
// supply pressure built up from previous sales of this mineral.
export function openMarketSellPrice(basePrice: number, unitsSold: number): number {
  return Math.round(basePrice * OPEN_MARKET_SELL_RATE * supplyDipMultiplier(unitsSold))
}

export function applySellMinerals(s: GameState, mineralId: string, amount: number): GameState {
  const stash = { ...(s.player.stash ?? {}) }
  const held = stash[mineralId] ?? 0
  const sellAmount = Math.min(amount, held)
  if (sellAmount <= 0) return s
  const meta = MINERAL_META[mineralId]
  if (!meta) return s
  const marketSupply = { ...(s.player.marketSupply ?? {}) }
  const unitsSold = marketSupply[mineralId] ?? 0
  const revenue = openMarketSellPrice(meta.price, unitsSold) * sellAmount
  marketSupply[mineralId] = unitsSold + sellAmount
  stash[mineralId] = held - sellAmount
  if (stash[mineralId] <= 0) delete stash[mineralId]
  return { ...s, player: { ...s.player, francs: s.player.francs + revenue, stash, marketSupply } }
}

export function applyStartRefine(s: GameState, recipe: RefineryRecipe): GameState {
  const stash = { ...(s.player.stash ?? {}) }
  const current = stash[recipe.input.mineral] ?? 0
  if (current < recipe.input.amount || s.player.francs < recipe.cost) return s
  stash[recipe.input.mineral] = current - recipe.input.amount
  return {
    ...s,
    player: {
      ...s.player,
      francs: s.player.francs - recipe.cost,
      stash,
      refineryQueue: [...s.player.refineryQueue, { recipeId: recipe.id, startedAt: Date.now() }],
    },
  }
}

export function applyCollectRefined(s: GameState, recipe: RefineryRecipe): GameState {
  const queue = [...s.player.refineryQueue]
  const idx = queue.findIndex(q => q.recipeId === recipe.id)
  if (idx < 0) return s
  const started = queue[idx].startedAt
  if ((Date.now() - started) / 1000 < recipe.time) return s
  queue.splice(idx, 1)
  return {
    ...s,
    player: {
      ...s.player,
      refineryQueue: queue,
      refinedGoods: { ...s.player.refinedGoods, [recipe.id]: (s.player.refinedGoods[recipe.id] ?? 0) + 1 },
    },
  }
}

export function applyUpgradeLaunchpad(s: GameState): GameState {
  if (s.player.launchpadUpgraded || s.player.francs < 1_000_000_000) return s
  return { ...s, player: { ...s.player, francs: s.player.francs - 1_000_000_000, launchpadUpgraded: true } }
}
