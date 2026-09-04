// Pure state-transition functions for the economy system.
// Covers: sell minerals, refinery queue, launchpad upgrade.

import type { GameState } from '@/lib/game-types'
import type { RefineryRecipe, ShipRoomKind, StructureBlueprint, RocketModel, SubsurfaceRoomId } from '@/lib/data'
import { rocketConfigForModel } from '@/lib/data'
import { recipeIsAffordable, rocketCompositionForId, rocketStageRecoveryForId } from '@/lib/data/rocket-composition'
import { MINERAL_META, CLIENT_SLOTS, LAUNCHPAD_UPGRADE_COST, OPEN_MARKET_SELL_RATE, MINERAL_SILO_CAPACITY, SURFACE_SILO_CAPACITY, DEEP_MINERAL_SILO_CAPACITY, REMOTE_MINERAL_SILO_CAPACITY, customizerPartById, deepSpaceTelescopeUnlocked, SUBSURFACE_EXCAVATE_COST, SUBSURFACE_ROOMS, canAffordSubsurface } from '@/lib/data'
import { structureIsStaffed } from './AcademySystem'
import type { DailyEconomySnapshot } from './DailyEconomySystem'

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
  player: Pick<GameState['player'], 'marketSupply' | 'marketSupplyUpdatedAt' | 'dailyEconomySnapshot'>,
  clientId?: string,
  now: number = Date.now(),
): { price: number; base: number; premiumApplied: boolean } {
  const meta = MINERAL_META[mineralId]
  if (!meta) return { price: 0, base: 0, premiumApplied: false }
  const snapshotQuote = player.dailyEconomySnapshot?.prices[mineralId]
  const unitsSold = decayedUnitsSold(player.marketSupply?.[mineralId] ?? 0, player.marketSupplyUpdatedAt?.[mineralId], now)
  // A published daily snapshot is authoritative. The old per-player supply
  // dip remains only as a compatibility fallback for saves created before the
  // shared daily economy exists.
  const base = snapshotQuote?.price ?? openMarketSellPrice(meta.price, unitsSold)
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
  player: Pick<GameState['player'], 'marketSupply' | 'marketSupplyUpdatedAt' | 'dailyEconomySnapshot'>,
  clientId?: string,
  now: number = Date.now(),
): number {
  return Object.entries(stash).reduce(
    (sum, [id, qty]) => sum + (qty > 0 ? sellUnitPrice(id, player, clientId, now).price * qty : 0),
    0,
  )
}

export function applySellMinerals(
  s: GameState,
  mineralId: string,
  amount: number,
  now: number = Date.now(),
  clientId?: string | null,
): GameState {
  const stash = { ...(s.player.stash ?? {}) }
  const held = stash[mineralId] ?? 0
  const sellAmount = Math.min(amount, held)
  if (sellAmount <= 0) return s
  if (!MINERAL_META[mineralId]) return s
  const marketSupply = { ...(s.player.marketSupply ?? {}) }
  const marketSupplyUpdatedAt = { ...(s.player.marketSupplyUpdatedAt ?? {}) }
  const unitsSold = decayedUnitsSold(marketSupply[mineralId] ?? 0, marketSupplyUpdatedAt[mineralId], now)
  // `null` explicitly means an open-market sale with no client premium. This
  // matters for a self-directed haul after a client job: lastClient is a
  // historical display context and must not leak a client's premium into the
  // player's own sale. Omitting the argument entirely (the Market screen's
  // "Sell" button) must resolve to the same client the screen quoted against
  // — `player.lastClient` — or the credited amount silently undercuts the
  // quote the player just saw.
  const effectiveClientId = clientId === undefined ? s.player.lastClient : clientId ?? undefined
  const revenue = sellUnitPrice(mineralId, s.player, effectiveClientId, now).price * sellAmount
  marketSupply[mineralId] = unitsSold + sellAmount
  marketSupplyUpdatedAt[mineralId] = now
  stash[mineralId] = held - sellAmount
  if (stash[mineralId] <= 0) delete stash[mineralId]
  return { ...s, player: { ...s.player, francs: s.player.francs + revenue, stash, marketSupply, marketSupplyUpdatedAt } }
}

// ── Earth-side ore storage (silos) ───────────────────────────────────────────
// A built Earth-side silo is what gives the player somewhere on Earth to KEEP
// a self-directed haul rather than selling it on return. Storage capacity, the
// silo fill visual, and the free-mission store/sell choice all read off these.

type StoragePlayer = { placed?: string[]; subsurfaceExcavated?: boolean; subsurfaceBuilt?: string[]; stash?: Record<string, number> }

/** True once any Earth-side silo is built — the prerequisite for keeping ore
 *  on Earth. Excavation alone is not enough; the room/building is the silo. */
export function earthStorageBuilt(player: Pick<StoragePlayer, 'placed' | 'subsurfaceBuilt'>): boolean {
  return (player.placed ?? []).includes('surface-silo')
    || (player.subsurfaceBuilt ?? []).includes('mineral-vault')
}

/** Number of Earth-side ore silos across the surface and underground tiers. */
export function siloCount(player: Pick<StoragePlayer, 'placed' | 'subsurfaceBuilt'>): number {
  return ((player.placed ?? []).includes('surface-silo') ? 1 : 0)
    + ((player.subsurfaceBuilt ?? []).includes('mineral-vault') ? 1 : 0)
    + ((player.subsurfaceBuilt ?? []).includes('deep-mineral-vault') ? 1 : 0)
}

/** Total ore units the player's silos can hold. 0 with no silo. */
export function storageCapacity(player: Pick<StoragePlayer, 'placed' | 'subsurfaceBuilt'>): number {
  return ((player.placed ?? []).includes('surface-silo') ? SURFACE_SILO_CAPACITY : 0)
    + ((player.subsurfaceBuilt ?? []).includes('mineral-vault') ? MINERAL_SILO_CAPACITY : 0)
    + ((player.subsurfaceBuilt ?? []).includes('deep-mineral-vault') ? DEEP_MINERAL_SILO_CAPACITY : 0)
}

/** Total ore units currently held in the stash. */
export function storedUnits(stash: Record<string, number> | undefined): number {
  return Object.values(stash ?? {}).reduce((sum, n) => sum + Math.max(0, n), 0)
}

/** Sell an explicit set of ore units out of the stash at current market prices,
 *  crediting francs and applying supply pressure per mineral — the same path a
 *  manual Commodity Exchange sale takes, run once per mineral in the set. Used
 *  when a self-directed haul (or a silo overflow) is sold on return. */
export function applySellHaul(s: GameState, haul: Record<string, number>, now: number = Date.now()): GameState {
  let next = s
  for (const [id, amount] of Object.entries(haul)) {
    if (amount > 0) next = applySellMinerals(next, id, amount, now, null)
  }
  return next
}

/** Pick which of a haul's units spill when a silo is over capacity: cheapest ore
 *  first, so the player keeps the valuable ore and only common ore is sold off.
 *  Never returns more units than the haul contains. */
export function pickOverflowFromHaul(haul: Record<string, number>, overflow: number): Record<string, number> {
  if (overflow <= 0) return {}
  const byCheapest = Object.entries(haul)
    .filter(([, n]) => n > 0)
    .sort((a, b) => (MINERAL_META[a[0]]?.price ?? 0) - (MINERAL_META[b[0]]?.price ?? 0))
  const spill: Record<string, number> = {}
  let remaining = overflow
  for (const [id, n] of byCheapest) {
    if (remaining <= 0) break
    const take = Math.min(n, remaining)
    spill[id] = take
    remaining -= take
  }
  return spill
}

/**
 * Resolve what happens to a self-directed ("free") mission's haul on return.
 * The haul is already in the stash by this point (the return leg stashes it),
 * so this only decides how much leaves again:
 *
 * - `sell` (or no vault built): sell the whole haul at market, crediting francs.
 * - `store` with a vault: keep the haul up to silo capacity; any units over
 *   capacity spill and are auto-sold (cheapest ore first). Ore already held
 *   before this run is never force-sold.
 */
export function applyFreeHaulDisposition(
  s: GameState,
  haul: Record<string, number>,
  disposition: 'store' | 'sell',
  now: number = Date.now(),
): GameState {
  if (!Object.values(haul).some(n => n > 0)) return s
  const effective = earthStorageBuilt(s.player) ? disposition : 'sell'
  if (effective === 'sell') {
    return applySellHaul(s, haul, now)
  }
  const overflow = Math.max(0, storedUnits(s.player.stash) - storageCapacity(s.player))
  if (overflow <= 0) return s
  return applySellHaul(s, pickOverflowFromHaul(haul, overflow), now)
}

export function hasOperationalRemoteSilo(player: Pick<GameState['player'], 'clientStructures'>, targetId: string): boolean {
  return !!targetId && (player.clientStructures ?? []).some(record =>
    record.targetId === targetId && record.structureKind === 'mineral-silo' && record.state === 'operational'
  )
}

/** Settle a self-directed haul at its mining destination before the return leg. */
export function applyRemoteHaulDisposition(
  s: GameState,
  targetId: string,
  haul: Record<string, number>,
  disposition: 'store' | 'sell',
  now: number = Date.now(),
): GameState {
  if (!hasOperationalRemoteSilo(s.player, targetId) || !Object.values(haul).some(amount => amount > 0)) {
    return s
  }
  if (disposition === 'sell') {
    const stash = { ...(s.player.stash ?? {}) }
    for (const [id, amount] of Object.entries(haul)) stash[id] = (stash[id] ?? 0) + amount
    const sold = applySellHaul({ ...s, player: { ...s.player, stash } }, haul, now)
    return { ...sold, player: { ...sold.player, cargoSettledOffworld: true } }
  }
  const prior = s.player.remoteStorage?.[targetId] ?? {}
  const used = storedUnits(prior)
  const room = Math.max(0, REMOTE_MINERAL_SILO_CAPACITY - used)
  const stored: Record<string, number> = { ...prior }
  const overflow: Record<string, number> = {}
  let remaining = room
  for (const [id, amount] of Object.entries(haul)) {
    const keep = Math.min(Math.max(0, amount), remaining)
    if (keep > 0) stored[id] = (stored[id] ?? 0) + keep
    if (amount > keep) overflow[id] = amount - keep
    remaining -= keep
  }
  const overflowStash = { ...(s.player.stash ?? {}) }
  for (const [id, amount] of Object.entries(overflow)) overflowStash[id] = (overflowStash[id] ?? 0) + amount
  const sold = Object.keys(overflow).length > 0 ? applySellHaul({ ...s, player: { ...s.player, stash: overflowStash } }, overflow, now) : s
  return { ...sold, player: { ...sold.player, cargoSettledOffworld: true, remoteStorage: { ...(sold.player.remoteStorage ?? {}), [targetId]: stored } } }
}

/** Sell collected refined goods at their recipe output value. */
export function applySellRefinedGoods(s: GameState, recipe: RefineryRecipe, amount: number): GameState {
  const available = s.player.refinedGoods[recipe.id] ?? 0
  const quantity = Math.min(Math.max(0, Math.floor(amount)), available)
  if (quantity <= 0) return s
  return {
    ...s,
    player: {
      ...s.player,
      francs: s.player.francs + recipe.output.price * quantity,
      refinedGoods: { ...s.player.refinedGoods, [recipe.id]: available - quantity },
    },
  }
}

export function applyStartRefine(s: GameState, recipe: RefineryRecipe): GameState {
  const lastStarted = s.player.refineryLastStartedAt
  const currentDay = new Date().toISOString().slice(0, 10)
  const lastDay = lastStarted == null ? null : new Date(lastStarted).toISOString().slice(0, 10)
  if (lastDay === currentDay) return s
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
      refineryLastStartedAt: Date.now(),
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
  if (s.player.pendingLaunch && s.player.pendingRocketId === rocket.id) return s
  if (s.player.francs < rocket.costFrancs) return s
  return {
    ...s,
    screen: 'fab',
    rocket: rocketConfigForModel(rocket),
    player: {
      ...s.player,
      francs: s.player.francs - rocket.costFrancs,
      pendingLaunch: true,
      pendingRocketId: rocket.id,
      pendingRocketSource: 'company',
    },
  }
}

/** Fabricate one physical rocket component from materials actually held in an
 * Earth silo. The component ledger is separate from ore so Hangar assembly can
 * consume an explicitly built vehicle rather than magic a whole rocket into
 * existence. */
export function applyFabricateRocketPart(s: GameState, rocketId: string, componentId: string): GameState {
  if (!earthStorageBuilt(s.player)) return s
  const recipe = rocketCompositionForId(rocketId).recipes.find(part => part.id === componentId)
  if (!recipe || !recipeIsAffordable(recipe, s.player.stash ?? {})) return s
  const stash = { ...(s.player.stash ?? {}) }
  for (const [mineral, amount] of Object.entries(recipe.ingredients)) {
    stash[mineral] = (stash[mineral] ?? 0) - amount
    if (stash[mineral] <= 0) delete stash[mineral]
  }
  return {
    ...s,
    player: {
      ...s.player,
      stash,
      fabricatedRocketParts: {
        ...(s.player.fabricatedRocketParts ?? {}),
        [componentId]: (s.player.fabricatedRocketParts?.[componentId] ?? 0) + 1,
      },
    },
  }
}

/** Consume one of every canonical component and move the locally assembled
 * vehicle to the Hangar/launchpad path. */
export function applyAssembleFabricatedRocket(s: GameState, rocket: RocketModel): GameState {
  if (s.player.pendingLaunch && s.player.pendingRocketId === rocket.id) return s
  if (!earthStorageBuilt(s.player)) return s
  const recipes = rocketCompositionForId(rocket.id).recipes
  if (!recipes.every(recipe => (s.player.fabricatedRocketParts?.[recipe.id] ?? 0) >= 1)) return s
  const fabricatedRocketParts = { ...(s.player.fabricatedRocketParts ?? {}) }
  for (const recipe of recipes) {
    fabricatedRocketParts[recipe.id] -= 1
    if (fabricatedRocketParts[recipe.id] <= 0) delete fabricatedRocketParts[recipe.id]
  }
  return {
    ...s,
    screen: 'fab',
    rocket: rocketConfigForModel(rocket),
    player: {
      ...s.player,
      fabricatedRocketParts,
      pendingLaunch: true,
      pendingRocketId: rocket.id,
      pendingRocketSource: 'fabricated',
    },
  }
}

/** Return only the recovered materials that fit in the existing Earth silo.
 * No silo means no hidden inventory; a full silo simply leaves excess teardown
 * output uncollected, which keeps the storage contract intact. */
export function applyRocketStageRecovery(s: GameState, rocket: RocketModel): GameState {
  if (!earthStorageBuilt(s.player)) return s
  let room = Math.max(0, storageCapacity(s.player) - storedUnits(s.player.stash))
  if (room <= 0) return s
  const stash = { ...(s.player.stash ?? {}) }
  let changed = false
  for (const [mineral, amount] of Object.entries(rocketStageRecoveryForId(rocket.id))) {
    const recovered = Math.min(amount, room)
    if (recovered <= 0) break
    stash[mineral] = (stash[mineral] ?? 0) + recovered
    room -= recovered
    changed = true
  }
  return changed ? { ...s, player: { ...s.player, stash } } : s
}

/** Pay for a structure and record where it was placed. This was previously
 *  hand-rolled inside `GameScreenRouter`'s JSX — the one place in the app that
 *  debited francs from a React component rather than a system function. */
export function applyPlaceStructure(s: GameState, structure: StructureBlueprint | undefined, kind: string, plot: number): GameState {
  if (!structure || structure.kind !== kind) return s
  if (s.player.placed.includes(kind)) return s
  if (kind === 'astronaut-academy' && !s.player.academyResearched) return s
  if (kind === 'deep-space-telescope' && !deepSpaceTelescopeUnlocked({ transitSatelliteLevel: s.player.transitSatelliteLevel, clientMissions: s.player.clientMissions })) return s
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
