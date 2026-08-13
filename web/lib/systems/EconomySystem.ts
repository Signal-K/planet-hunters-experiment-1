// Pure state-transition functions for the economy system.
// Covers: sell minerals, refinery queue, launchpad upgrade.

import type { GameState } from '@/lib/game-types'
import type { RefineryRecipe, ShipRoomKind, StructureBlueprint, RocketModel, SubsurfaceRoomId } from '@/lib/data'
import { MINERAL_META, CLIENT_SLOTS, LAUNCHPAD_UPGRADE_COST, OPEN_MARKET_SELL_RATE, customizerPartById, deepSpaceTelescopeUnlocked, SUBSURFACE_EXCAVATE_COST, SUBSURFACE_ROOMS, canAffordSubsurface } from '@/lib/data'
import { structureIsStaffed } from './AcademySystem'

// Sell to open market (raw): ~80% of book value — see [[Economy and Minerals]].
export { OPEN_MARKET_SELL_RATE } from '@/lib/data'
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

/** What one unit of a mineral fetches right now, and why — the single source
 *  of truth for both the Commodity Exchange's quoted price and the francs
 *  `applySellMinerals` actually credits.
 *
 *  The two used to disagree: the screen quoted the client's premium applied to
 *  the *undiscounted* base price while the sale paid the open-market rate, so
 *  a player with an active client was shown a price they could never receive.
 *  The premium is real (it is what the client's contract advertises), so it is
 *  honoured here rather than dropped from the display. */
export function sellUnitPrice(
  mineralId: string,
  player: Pick<GameState['player'], 'marketSupply' | 'marketSupplyUpdatedAt'>,
  clientId?: string,
  now: number = Date.now(),
): { price: number; base: number; premiumApplied: boolean } {
  const meta = MINERAL_META[mineralId]
  if (!meta) return { price: 0, base: 0, premiumApplied: false }
  const unitsSold = decayedUnitsSold(player.marketSupply?.[mineralId] ?? 0, player.marketSupplyUpdatedAt?.[mineralId], now)
  const base = openMarketSellPrice(meta.price, unitsSold)
  const client = clientId ? CLIENT_SLOTS.find(c => c.id === clientId) : undefined
  const premiumApplied = !!client && client.mineralPreferences.includes(mineralId) && client.payoutPremium > 0
  return {
    price: premiumApplied ? Math.round(base * (1 + client!.payoutPremium)) : base,
    base,
    premiumApplied,
  }
}

/** Total francs a stash (or a subset of it) would fetch at current prices. */
export function sellQuote(
  stash: Record<string, number>,
  player: Pick<GameState['player'], 'marketSupply' | 'marketSupplyUpdatedAt'>,
  clientId?: string,
  now: number = Date.now(),
): number {
  return Object.entries(stash).reduce(
    (sum, [id, qty]) => sum + (qty > 0 ? sellUnitPrice(id, player, clientId, now).price * qty : 0),
    0,
  )
}

export function applySellMinerals(s: GameState, mineralId: string, amount: number, now: number = Date.now()): GameState {
  const stash = { ...(s.player.stash ?? {}) }
  const held = stash[mineralId] ?? 0
  const sellAmount = Math.min(amount, held)
  if (sellAmount <= 0) return s
  if (!MINERAL_META[mineralId]) return s
  const marketSupply = { ...(s.player.marketSupply ?? {}) }
  const marketSupplyUpdatedAt = { ...(s.player.marketSupplyUpdatedAt ?? {}) }
  const unitsSold = decayedUnitsSold(marketSupply[mineralId] ?? 0, marketSupplyUpdatedAt[mineralId], now)
  const revenue = sellUnitPrice(mineralId, s.player, s.player.lastClient, now).price * sellAmount
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
      refineryQueue: [...s.player.refineryQueue, {
        recipeId: recipe.id,
        startedAt: Date.now(),
        durationMs: recipe.time * 1000 * (structureIsStaffed(s.player, 'refinery') ? 0.75 : 1),
      }],
    },
  }
}

export function applyCollectRefined(s: GameState, recipe: RefineryRecipe): GameState {
  const queue = [...s.player.refineryQueue]
  const idx = queue.findIndex(q => q.recipeId === recipe.id)
  if (idx < 0) return s
  const started = queue[idx].startedAt
  if (Date.now() - started < (queue[idx].durationMs ?? recipe.time * 1000)) return s
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

/** Buy the rocket a mission will fly. Francs used to be deducted inline in
 *  `useGameLoop`; every purchase in the game now goes through this file. */
export function applyPurchaseRocket(s: GameState, rocket: RocketModel): GameState {
  if (s.player.francs < rocket.costFrancs) return s
  return {
    ...s,
    screen: 'fab',
    player: {
      ...s.player,
      francs: s.player.francs - rocket.costFrancs,
      pendingLaunch: true,
      pendingRocketId: rocket.id,
    },
  }
}

/** Pay for a structure and record where it was placed. This was previously
 *  hand-rolled inside `GameScreenRouter`'s JSX — the one place in the app that
 *  debited francs from a React component rather than a system function. */
export function applyPlaceStructure(s: GameState, structure: StructureBlueprint | undefined, kind: string, plot: number): GameState {
  if (!structure || structure.kind !== kind) return s
  if (s.player.placed.includes(kind)) return s
  if (kind === 'astronaut-academy' && !s.player.academyResearched) return s
  if (kind === 'deep-space-telescope' && !deepSpaceTelescopeUnlocked({ satelliteMonitoringLevel: s.player.satelliteMonitoringLevel, clientMissions: s.player.clientMissions })) return s
  if (s.player.francs < structure.cost) return s
  if (!Object.entries(structure.costMaterials ?? {}).every(([mineral, amount]) => (s.player.stash?.[mineral] ?? 0) >= amount)) return s
  const stash = { ...(s.player.stash ?? {}) }
  for (const [mineral, amount] of Object.entries(structure.costMaterials ?? {})) {
    stash[mineral] = Math.max(0, (stash[mineral] ?? 0) - amount)
  }
  return {
    ...s,
    player: {
      ...s.player,
      francs: s.player.francs - structure.cost,
      stash,
      placed: Array.from(new Set([...s.player.placed, kind])),
      placementPlots: { ...s.player.placementPlots, [kind]: plot },
      refineryBuilt: kind === 'refinery' ? true : s.player.refineryBuilt,
      scannerBuilt: kind === 'scan-station' ? true : s.player.scannerBuilt,
      satelliteMonitoringBuilt: kind === 'satellite-monitoring-station' ? true : s.player.satelliteMonitoringBuilt,
      satelliteMonitoringLevel: kind === 'satellite-monitoring-station'
        ? Math.max(1, s.player.satelliteMonitoringLevel ?? 1)
        : s.player.satelliteMonitoringLevel,
      deepSpaceTelescopeBuilt: kind === 'deep-space-telescope' ? true : s.player.deepSpaceTelescopeBuilt,
      deepSpaceTelescopeLevel: kind === 'deep-space-telescope'
        ? Math.max(1, s.player.deepSpaceTelescopeLevel ?? 1)
        : s.player.deepSpaceTelescopeLevel,
      deepSpaceTelescopeLaunchedAt: kind === 'deep-space-telescope' ? Date.now() : s.player.deepSpaceTelescopeLaunchedAt,
      academyFunded: kind === 'astronaut-academy' ? true : s.player.academyFunded,
      crewUpkeepSettledDate: kind === 'astronaut-academy'
        ? new Date().toISOString().slice(0, 10)
        : s.player.crewUpkeepSettledDate,
    },
  }
}

export function applyExcavateSubsurface(s: GameState): GameState {
  if (s.player.subsurfaceExcavated) return s
  if (!canAffordSubsurface(SUBSURFACE_EXCAVATE_COST, { francs: s.player.francs, stash: s.player.stash })) return s
  const stash = { ...(s.player.stash ?? {}) }
  for (const [mineral, amount] of Object.entries(SUBSURFACE_EXCAVATE_COST.costMaterials)) {
    stash[mineral] = Math.max(0, (stash[mineral] ?? 0) - amount)
  }
  return {
    ...s,
    player: {
      ...s.player,
      francs: s.player.francs - SUBSURFACE_EXCAVATE_COST.cost,
      stash,
      subsurfaceExcavated: true,
    },
  }
}

export function applyBuildSubsurfaceRoom(s: GameState, roomId: SubsurfaceRoomId): GameState {
  if (!s.player.subsurfaceExcavated) return s
  if (s.player.subsurfaceBuilt?.includes(roomId)) return s
  const room = SUBSURFACE_ROOMS.find(candidate => candidate.id === roomId)
  if (!room) return s
  if (!canAffordSubsurface(room, { francs: s.player.francs, stash: s.player.stash })) return s
  const stash = { ...(s.player.stash ?? {}) }
  for (const [mineral, amount] of Object.entries(room.costMaterials)) {
    stash[mineral] = Math.max(0, (stash[mineral] ?? 0) - amount)
  }
  return {
    ...s,
    player: {
      ...s.player,
      francs: s.player.francs - room.cost,
      stash,
      subsurfaceBuilt: Array.from(new Set([...(s.player.subsurfaceBuilt ?? []), roomId])),
    },
  }
}

export function applyUpgradeLaunchpad(s: GameState): GameState {
  if (s.player.launchpadUpgraded || s.player.francs < LAUNCHPAD_UPGRADE_COST) return s
  return { ...s, player: { ...s.player, francs: s.player.francs - LAUNCHPAD_UPGRADE_COST, launchpadUpgraded: true } }
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
