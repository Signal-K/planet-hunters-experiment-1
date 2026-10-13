// SSL-553: returning the minerals. Back on the Earth pad, every unit of the haul
// goes to one of three places: the contract client, the underground silo, or the
// open market. The haul is already in the stash (the return leg stashes it), so
// settling only takes units out again: sold units leave for francs, client units
// are handed to the debrief ledger as `consumed`, silo units simply stay.

import type { GameState } from '@/lib/game-types'
import type { Mission } from '@/lib/data'
import { calibrateOnboardingPayout, isFreeHaulMission } from '@/lib/data'
import { applySellHaul, earthStorageBuilt, sellUnitPrice, storageCapacity, storedUnits } from './EconomySystem'

export type HomeDestination = 'client' | 'silo' | 'sell'
export type HomeSplit = Record<string, Record<HomeDestination, number>>

/** Units the contract still wants per mineral (0 for self-directed hauls). */
export function clientDemand(mission: Mission | null | undefined, cargo: Record<string, number>): Record<string, number> {
  if (!mission || isFreeHaulMission(mission, cargo) || !mission.client) return {}
  const required = mission.construction?.requiredMaterials ?? mission.requires.minerals
  return Object.fromEntries(Object.entries(required).filter(([, n]) => n > 0))
}

/** Free silo room for this haul. The haul already sits in the stash, so it does not count against the room. */
export function siloRoomFor(player: GameState['player'], cargo: Record<string, number>): { capacity: number; used: number; free: number; built: boolean } {
  const built = earthStorageBuilt(player)
  const capacity = built ? storageCapacity(player) : 0
  const haul = storedUnits(cargo)
  const used = Math.max(0, storedUnits(player.stash) - haul)
  return { capacity, used, free: Math.max(0, capacity - used), built }
}

/** Sensible starting split: fill the contract first, then the silo, then sell the rest. */
export function defaultHomeSplit(cargo: Record<string, number>, demand: Record<string, number>, siloFree: number): HomeSplit {
  const split: HomeSplit = {}
  let room = siloFree
  for (const [id, units] of Object.entries(cargo)) {
    if (units <= 0) continue
    const client = Math.min(units, demand[id] ?? 0)
    const silo = Math.min(units - client, room)
    room -= silo
    split[id] = { client, silo, sell: units - client - silo }
  }
  return split
}

/** Move one unit of `id` to `to`, taking it from the fullest other choice. Respects demand and silo room. */
export function shiftUnit(split: HomeSplit, id: string, to: HomeDestination, demand: Record<string, number>, siloFree: number): HomeSplit {
  const row = split[id]
  if (!row) return split
  if (to === 'client' && row.client >= (demand[id] ?? 0)) return split
  if (to === 'silo' && splitTotals(split).silo >= siloFree) return split
  const from = (['sell', 'silo', 'client'] as HomeDestination[]).filter(k => k !== to && row[k] > 0)[0]
  if (!from) return split
  return { ...split, [id]: { ...row, [from]: row[from] - 1, [to]: row[to] + 1 } }
}

/** Move one unit of `id` out of `from` into the market (or the silo when taking from sell). */
export function releaseUnit(split: HomeSplit, id: string, from: HomeDestination, siloFree: number): HomeSplit {
  const row = split[id]
  if (!row || row[from] <= 0) return split
  const to: HomeDestination = from === 'sell' ? (splitTotals(split).silo < siloFree ? 'silo' : 'sell') : 'sell'
  if (to === from) return split
  return { ...split, [id]: { ...row, [from]: row[from] - 1, [to]: row[to] + 1 } }
}

export function splitTotals(split: HomeSplit): Record<HomeDestination, number> {
  const t = { client: 0, silo: 0, sell: 0 }
  for (const row of Object.values(split)) { t.client += row.client; t.silo += row.silo; t.sell += row.sell }
  return t
}

export function pick(split: HomeSplit, dest: HomeDestination): Record<string, number> {
  return Object.fromEntries(Object.entries(split).map(([id, row]) => [id, row[dest]]).filter(([, n]) => (n as number) > 0))
}

/** True when the client portion fills every required mineral. */
export function contractFulfilled(split: HomeSplit, demand: Record<string, number>): boolean {
  const entries = Object.entries(demand)
  return entries.length > 0 && entries.every(([id, n]) => (split[id]?.client ?? 0) >= n)
}

/** Francs the client pays for this split (the contract value, only when fulfilled). */
export function clientPayout(mission: Mission | null | undefined, split: HomeSplit, demand: Record<string, number>, missionsDone: number): number {
  if (!mission || !contractFulfilled(split, demand)) return 0
  return calibrateOnboardingPayout(mission.payout.francs, missionsDone)
}

/** Francs the market pays for the sell portion right now (open market, no client premium). */
export function marketValue(player: GameState['player'], units: Record<string, number>, now = Date.now()): number {
  return Object.entries(units).reduce((sum, [id, n]) => sum + sellUnitPrice(id, player, undefined, now).price * n, 0)
}

/**
 * Settle the market and silo parts of the split. Sold units leave the stash for
 * francs; silo units stay. The client portion is returned for the debrief ledger
 * to consume, and the haul is marked settled so the free-haul store/sell step in
 * the debrief does not run again.
 */
export function applyHomeSplit(s: GameState, split: HomeSplit, now = Date.now()): { state: GameState; consumed: Record<string, number> } {
  const sold = applySellHaul(s, pick(split, 'sell'), now)
  return {
    state: { ...sold, player: { ...sold.player, homeDeliveryPending: false, cargoSettledOffworld: true, freeHaulDisposition: undefined } },
    consumed: pick(split, 'client'),
  }
}
