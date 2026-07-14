// Pure state-transition functions for the economy system.
// Covers: sell minerals, refinery queue, launchpad upgrade.

import type { GameState } from '@/lib/game-types'
import type { RefineryRecipe, ShipRoomKind } from '@/lib/data'
import { MINERAL_META, customizerPartById } from '@/lib/data'

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

// Supply pressure recovers over real time so a mineral's price isn't
// permanently discounted once a player has ever sold enough of it — full
// recovery from the max dip takes this long of real-world elapsed time.
const SUPPLY_RECOVERY_WINDOW_MS = 2 * 60 * 60 * 1000
const FULL_DIP_UNITS = MAX_SUPPLY_DIP / SUPPLY_DIP_PER_UNIT

// Effective (decayed) units-sold value to price against, given the raw
// stored counter and when it was last updated. Missing `lastSoldAt` (e.g.
// save data from before this decay was introduced) is treated as "just now"
// — no retroactive decay, no penalty either.
export function decayedUnitsSold(unitsSold: number, lastSoldAt: number | undefined, now: number = Date.now()): number {
  if (unitsSold <= 0 || lastSoldAt == null) return Math.max(0, unitsSold)
  const elapsed = Math.max(0, now - lastSoldAt)
  const recovered = (elapsed / SUPPLY_RECOVERY_WINDOW_MS) * FULL_DIP_UNITS
  return Math.max(0, unitsSold - recovered)
}

// Effective open-market unit price after the raw-sale discount and any
// supply pressure built up from previous sales of this mineral.
export function openMarketSellPrice(basePrice: number, unitsSold: number): number {
  return Math.round(basePrice * OPEN_MARKET_SELL_RATE * supplyDipMultiplier(unitsSold))
}

export function applySellMinerals(s: GameState, mineralId: string, amount: number, now: number = Date.now()): GameState {
  const stash = { ...(s.player.stash ?? {}) }
  const held = stash[mineralId] ?? 0
  const sellAmount = Math.min(amount, held)
  if (sellAmount <= 0) return s
  const meta = MINERAL_META[mineralId]
  if (!meta) return s
  const marketSupply = { ...(s.player.marketSupply ?? {}) }
  const marketSupplyUpdatedAt = { ...(s.player.marketSupplyUpdatedAt ?? {}) }
  const unitsSold = decayedUnitsSold(marketSupply[mineralId] ?? 0, marketSupplyUpdatedAt[mineralId], now)
  const revenue = openMarketSellPrice(meta.price, unitsSold) * sellAmount
  marketSupply[mineralId] = unitsSold + sellAmount
  marketSupplyUpdatedAt[mineralId] = now
  stash[mineralId] = held - sellAmount
  if (stash[mineralId] <= 0) delete stash[mineralId]
  return { ...s, player: { ...s.player, francs: s.player.francs + revenue, stash, marketSupply, marketSupplyUpdatedAt } }
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

// Ship customiser: swaps/upgrades individual room parts on the player's owned
// Explorer. Only charges the price delta for slots that actually changed —
// an unchanged slot (already owned from a prior confirm) is free to re-confirm.
// Returns whether the build was applied (false if the player can't afford it).
export function applyConfirmShipCustomizerBuild(
  s: GameState,
  installed: Partial<Record<ShipRoomKind, string>>,
  prevInstalled: Partial<Record<ShipRoomKind, string>>,
): { state: GameState; ok: boolean } {
  let netCost = 0
  for (const kind of Object.keys(installed) as ShipRoomKind[]) {
    const nextId = installed[kind]
    const prevId = prevInstalled[kind]
    if (nextId === prevId) continue
    const nextPrice = nextId ? customizerPartById(nextId)?.price ?? 0 : 0
    const prevPrice = prevId ? customizerPartById(prevId)?.price ?? 0 : 0
    netCost += nextPrice - prevPrice
  }
  if (netCost > s.player.francs) return { state: s, ok: false }
  return {
    ok: true,
    state: {
      ...s,
      player: {
        ...s.player,
        francs: s.player.francs - netCost,
        shipCustomizerParts: installed,
      },
    },
  }
}
