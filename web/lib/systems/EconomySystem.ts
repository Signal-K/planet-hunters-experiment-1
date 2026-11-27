import { agencyLevel } from '@/lib/agency/construction-translation'
import { weeklyRocketPartById } from '@/lib/data/weeklyRocketParts'
import { earnedRocketParts, workshopPartPrice } from '@/lib/launchpad/workshop'
import type { BuildingLevels } from '@/lib/data/building-levels'
import { MISSIONS } from '@/lib/data'
import { rocketPrice } from '@/lib/rockets'
// Pure state-transition functions for the economy system.
// Covers: sell minerals, refinery queue, launchpad upgrade.

import type { GameState } from '@/lib/game-types'
import { addStamp } from '@/lib/research/stamps'
import { STRUCTURE_PRICES } from '@/lib/data/economy'
import { nextGroundTelescopeId } from './InstrumentFeedSystem'
import type { ShipRoomKind, RocketModel, } from '@/lib/data'
import { rocketConfigForModel } from '@/lib/data'
import { recipeIsAffordable, rocketCompositionForId, rocketStageRecoveryForId } from '@/lib/data/rocket-composition'
import { MINERAL_META, isArtifactMineralId, CLIENT_SLOTS, OPEN_MARKET_SELL_RATE, SURFACE_SILO_CAPACITY, customizerPartById, } from '@/lib/data'
import { PAD_SERVICE_COST, exchangeSaleBonus, siloCapacityMultiplier, } from '@/lib/data/building-levels'
import { permanentResearchSaleRate } from '@/lib/research/marketplace'

// Sell to open market (raw): ~80% of book value — see [[Economy and Minerals]].
export { OPEN_MARKET_SELL_RATE } from '@/lib/data'
// Market price fluctuates based on supply — selling excess repeatedly causes
// a price dip, capped so a mineral never sells for less than 40% of its
// (already 80%-discounted) reference price.
const SUPPLY_DIP_PER_UNIT = 0.01
const MAX_SUPPLY_DIP = 0.6

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
  player: Pick<GameState['player'], 'placed' | 'marketSupply' | 'marketSupplyUpdatedAt' | 'dailyEconomySnapshot' | 'researchPermanentBonuses' | 'communityBonus'> & Partial<Pick<GameState['player'], 'buildingLevels' | 'launchpadUpgraded' | 'agencyLevels'>>,
  clientId?: string,
  now: number = Date.now(),
): { price: number; base: number; premiumApplied: boolean; bonusApplied: boolean } {
  const meta = MINERAL_META[mineralId]
  if (!meta || isArtifactMineralId(mineralId)) return { price: 0, base: 0, premiumApplied: false, bonusApplied: false }
  const snapshotQuote = player.dailyEconomySnapshot?.prices[mineralId]
  const unitsSold = decayedUnitsSold(player.marketSupply?.[mineralId] ?? 0, player.marketSupplyUpdatedAt?.[mineralId], now)
  // A published daily snapshot is authoritative. The old per-player supply
  // dip remains only as a compatibility fallback for saves created before the
  // shared daily economy exists.
  // A player can always make an open-market sale, but the physical Exchange
  // is what gives access to the full quoted price. Without it, the broker
  // takes the open-market discount; both paths still respond to supply.
  const exchangeLevel = agencyLevel(player, 'exchange')
  const exchangeBuilt = exchangeLevel > 0
  const base = snapshotQuote?.price ?? Math.round(meta.price * (exchangeBuilt ? 1 : OPEN_MARKET_SELL_RATE) * supplyDipMultiplier(unitsSold))
  const client = clientId ? CLIENT_SLOTS.find(c => c.id === clientId) : undefined
  const premiumApplied = !!client && client.mineralPreferences.includes(mineralId) && client.payoutPremium > 0
  // SSL-792: an upgraded Exchange pays a little more on every sale.
  const exchangeBonus = exchangeBuilt ? exchangeSaleBonus(exchangeLevel) : 0
  const quoted = Math.round((premiumApplied ? base * (1 + client!.payoutPremium) : base) * (1 + exchangeBonus))
  const permanentRate = permanentResearchSaleRate(player, now)
  const bonusApplied = permanentRate > 0
  return {
    price: bonusApplied ? Math.round(quoted * (1 + permanentRate)) : quoted,
    base,
    premiumApplied,
    bonusApplied,
  }
}

/** Total francs a stash (or a subset of it) would fetch at current prices. */
export function sellQuote(
  stash: Record<string, number>,
  player: Pick<GameState['player'], 'placed' | 'marketSupply' | 'marketSupplyUpdatedAt' | 'dailyEconomySnapshot' | 'researchPermanentBonuses' | 'communityBonus'>,
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
  if (!MINERAL_META[mineralId] || isArtifactMineralId(mineralId)) return s
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
  return { ...s, player: addStamp({ ...s.player, francs: s.player.francs + revenue, stash, marketSupply, marketSupplyUpdatedAt }, 'exchange-sale', now) }
}

// ── Earth-side ore storage (silos) ───────────────────────────────────────────
// A built Earth-side silo is what gives the player somewhere on Earth to KEEP
// a self-directed haul rather than selling it on return. Storage capacity, the
// silo fill visual, and the free-mission store/sell choice all read off these.

type StoragePlayer = { placed?: string[]; storageBonus?: number; stash?: Record<string, number>; buildingLevels?: BuildingLevels; launchpadUpgraded?: boolean; controlBuilt?: boolean; agencyLevels?: GameState['player']['agencyLevels'] }

/** True once any Earth-side silo is built — the prerequisite for keeping ore
 *  on Earth. Excavation alone is not enough; the room/building is the silo. */
export function earthStorageBuilt(player: Pick<StoragePlayer, 'placed' | 'storageBonus'>): boolean {
  return (player.placed ?? []).includes('surface-silo')
    || (player.storageBonus ?? 0) > 0
}

/** Total ore units the player's silos can hold. 0 with no silo. */
export function storageCapacity(player: Pick<StoragePlayer, 'placed' | 'storageBonus' | 'buildingLevels' | 'agencyLevels'>): number {
  return (agencyLevel(player, 'ore-storage') > 0 ? SURFACE_SILO_CAPACITY * siloCapacityMultiplier(agencyLevel(player, 'ore-storage')) : 0)
    + Math.max(0, player.storageBonus ?? 0)
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
 * - `store` with a vault: the new haul goes into the silo. SSL-845 (Liam, 16 Nov:
 *   a full silo must never stop him storing what he mines): when it does not fit,
 *   the cheapest ore already in the silo is sold at market to make room, then (only
 *   if the haul alone is bigger than the silo) the haul's own cheapest ore.
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
  return applySellHaul(s, pickSpillForStore(s.player.stash ?? {}, haul, overflow), now)
}

/** SSL-845: what leaves the silo when a stored haul does not fit. Older stock goes first, cheapest ore first, so the
 *  haul the player chose to store stays; only a haul bigger than the whole silo spills its own cheapest ore. */
export function pickSpillForStore(stash: Record<string, number>, haul: Record<string, number>, overflow: number): Record<string, number> {
  if (overflow <= 0) return {}
  const older: Record<string, number> = {}
  for (const [id, n] of Object.entries(stash)) {
    const kept = Math.max(0, n) - Math.max(0, haul[id] ?? 0)
    if (kept > 0) older[id] = kept
  }
  const fromOlder = pickOverflowFromHaul(older, overflow)
  const rest = overflow - storedUnits(fromOlder)
  const fromHaul = pickOverflowFromHaul(haul, rest)
  const spill: Record<string, number> = { ...fromOlder }
  for (const [id, n] of Object.entries(fromHaul)) spill[id] = (spill[id] ?? 0) + n
  return spill
}

export function applyBuildGroundTelescope(s: GameState): GameState {
  const id = nextGroundTelescopeId(s.player)
  if (!id) return s
  if (!s.player.freeOperations) return s
  if (s.player.francs < STRUCTURE_PRICES.groundTelescope) return s
  return {
    ...s,
    // SSL-852: building a telescope is putting an agency craft up, the same research stamp as a launch.
    player: addStamp({
      ...s.player,
      francs: s.player.francs - STRUCTURE_PRICES.groundTelescope,
      placed: [...s.player.placed, id],
    }, 'launch', Date.now(), 'asteroid-discovery'),
  }
}

/** Buy the rocket a mission will fly. Francs used to be deducted inline in
 *  `useGameLoop`; every purchase in the game now goes through this file. */
export function applyPurchaseRocket(s: GameState, rocket: RocketModel): GameState {
  const price = rocketPrice(rocket, s.player, { payloadType: MISSIONS.find(m => m.id === s.missionId)?.payload?.type })
  if (s.player.francs < price) return s
  const missionId = s.missionId ?? 'unassigned'
  const targetId = s.targetId ?? 'unassigned'
  const stagedRocket = {
    id: `${rocket.id}-${missionId}-${targetId}-${(s.player.stagedRockets ?? []).length + 1}`,
    rocketId: rocket.id,
    rocket: rocketConfigForModel(rocket),
    location: 'hangar' as const,
    source: 'company' as const,
    missionId,
    targetId,
    deliveryTargetId: s.deliveryTargetId,
  }
  return {
    ...s,
    screen: 'fab',
    rocket: stagedRocket.rocket,
    player: {
      ...s.player,
      francs: s.player.francs - price,
      pendingLaunch: true,
      // SSL-313: remembered per model so the Blueprint CTA can say "BUILD"
      // the first time and "BUILD ANOTHER" only for a genuine repeat.
      rocketPurchaseCounts: {
        ...(s.player.rocketPurchaseCounts ?? {}),
        [rocket.id]: (s.player.rocketPurchaseCounts?.[rocket.id] ?? 0) + 1,
      },
      stagedRockets: [...(s.player.stagedRockets ?? []), stagedRocket],
      selectedStagedRocketId: stagedRocket.id,
      pendingRocketId: rocket.id,
      pendingRocketLocation: 'hangar',
      pendingRocketSource: 'company',
    },
  }
}

/**
 * Keep the refusal explanation beside the authoritative purchase guard.  The
 * blueprint screen is allowed to be optimistic while saves hydrate, but it
 * must never turn a rejected build into an unexplained no-op.
 */
export function rocketPurchaseRefusal(s: GameState, rocket: RocketModel): string | null {
  // SSL-450: the launch review (screen 'fab') is where a vehicle is prepared.
  if (s.screen !== 'rocket-buy' && s.screen !== 'fab' && s.screen !== 'targets' && s.screen !== 'hangar') return 'Return to the launch review before building.'
  if (!s.missionId || !s.targetId) return 'Choose a contract destination before building a rocket.'
  const price = rocketPrice(rocket, s.player, { payloadType: MISSIONS.find(m => m.id === s.missionId)?.payload?.type })
  // Never charge twice for the same job: a vehicle of this model already staged for this contract is the one that flies.
  const alreadyStaged = (s.player.stagedRockets ?? []).some(v => v.rocketId === rocket.id && v.missionId === s.missionId
    && v.targetId === s.targetId && (v.location === 'hangar' || v.location === 'launchpad'))
  if (alreadyStaged && price > 0) return 'This rocket is already staged for this job.'
  if (s.player.francs < price) {
    return `Need ${price - s.player.francs} more francs to build this rocket.`
  }
  return null
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
  const missionId = s.missionId ?? 'unassigned'
  const targetId = s.targetId ?? 'unassigned'
  const stagedRocket = {
    id: `${rocket.id}-${missionId}-${targetId}-${(s.player.stagedRockets ?? []).length + 1}`,
    rocketId: rocket.id,
    rocket: rocketConfigForModel(rocket),
    location: 'hangar' as const,
    source: 'fabricated' as const,
    missionId,
    targetId,
    deliveryTargetId: s.deliveryTargetId,
  }
  return {
    ...s,
    screen: 'fab',
    rocket: stagedRocket.rocket,
    player: {
      ...s.player,
      fabricatedRocketParts,
      pendingLaunch: true,
      stagedRockets: [...(s.player.stagedRockets ?? []), stagedRocket],
      selectedStagedRocketId: stagedRocket.id,
      pendingRocketId: rocket.id,
      pendingRocketLocation: 'hangar',
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

/** Pay to service the launchpad: resets the launch count. No-op if the pad is not placed, unworn or unaffordable. */
export function applyServiceLaunchpad(s: GameState): GameState {
  if (!s.player.placed.includes('launchpad') || (s.player.padLaunches ?? 0) <= 0 || s.player.francs < PAD_SERVICE_COST) return s
  return { ...s, player: { ...s.player, francs: s.player.francs - PAD_SERVICE_COST, padLaunches: 0 } }
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
  // Price from authoritative current state; a free earned part never creates a refund.
  const current = s.player.shipCustomizerParts ?? {}
  let netCost = 0
  for (const kind of new Set([...Object.keys(current), ...Object.keys(installed)])) {
    const nextId = (installed as Record<string, string | undefined>)[kind]
    const prevId = (current as Record<string, string | undefined>)[kind]
    if (nextId === prevId) continue
    const part = nextId ? customizerPartById(nextId) : undefined
    if (nextId && weeklyRocketPartById(nextId) && !earnedRocketParts(s.player).includes(nextId)) return { state: s, ok: false }
    if (nextId && (!part || (kind === 'mining-laser' ? !nextId.includes('laser') : part.kind !== kind))) return { state: s, ok: false }
    if (part && (part.unlockedAtMissions ?? 0) > s.player.missionsDone && !earnedRocketParts(s.player).includes(part.id)) return { state: s, ok: false }
    netCost += (nextId ? workshopPartPrice(nextId, s.player) : 0) - (prevId ? workshopPartPrice(prevId, s.player) : 0)
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

function supplyDipMultiplier(unitsSold: number): number {
  return Math.max(1 - MAX_SUPPLY_DIP, 1 - unitsSold * SUPPLY_DIP_PER_UNIT)
}
