// SSL-553: returning the minerals. Back on the Earth pad, each unit of the haul
// goes to the contract client or the Surface Silo. Ore that fits neither stays
// behind; nothing is sold. The haul is already in the stash (the return leg stashes it), so
// settling only takes units out again: client units are handed to the debrief
// ledger as `consumed`, silo units stay, and left-behind units are dropped.

import type { GameState, HomeSettlement } from '@/lib/game-types'
import type { Mission } from '@/lib/data'
import { calibrateOnboardingPayout, isFreeHaulMission } from '@/lib/data'
import { storageCapacity, storedUnits } from './EconomySystem'

export type HomeDestination = 'client' | 'silo'
/** Units of each mineral sent to the client and to the silo. Whatever is left of the cargo stays behind. */
export type HomeSplit = Record<string, Record<HomeDestination, number>>

/** Units the contract still wants per mineral (0 for self-directed hauls). */
export function clientDemand(mission: Mission | null | undefined, cargo: Record<string, number>): Record<string, number> {
  if (!mission || isFreeHaulMission(mission, cargo) || !mission.client) return {}
  const required = mission.construction?.requiredMaterials ?? mission.requires.minerals
  return Object.fromEntries(Object.entries(required).filter(([, n]) => n > 0))
}

/** Silo room for this haul. The haul already sits in the stash, so it does not count against the room. */
export function siloRoomFor(player: GameState['player'], cargo: Record<string, number>): { capacity: number; used: number; free: number } {
  const capacity = storageCapacity(player)
  const used = Math.max(0, storedUnits(player.stash) - storedUnits(cargo))
  return { capacity, used, free: Math.max(0, capacity - used) }
}

/** Sensible starting split: fill the contract first, then the silo. */
export function defaultHomeSplit(cargo: Record<string, number>, demand: Record<string, number>, siloFree: number): HomeSplit {
  const split: HomeSplit = {}
  let room = siloFree
  for (const [id, units] of Object.entries(cargo)) {
    if (units <= 0) continue
    const client = Math.min(units, demand[id] ?? 0)
    const silo = Math.min(units - client, room)
    room -= silo
    split[id] = { client, silo }
  }
  return split
}

/** Units of `id` the split leaves behind. */
export function leftBehind(split: HomeSplit, cargo: Record<string, number>, id: string): number {
  const row = split[id]
  return Math.max(0, (cargo[id] ?? 0) - (row?.client ?? 0) - (row?.silo ?? 0))
}

/** Send one more unit of `id` to `to`, if the cargo has one unplaced, or take it from the other choice. Respects demand and silo room. */
export function shiftUnit(split: HomeSplit, cargo: Record<string, number>, id: string, to: HomeDestination, demand: Record<string, number>, siloFree: number): HomeSplit {
  const row = split[id]
  if (!row) return split
  if (to === 'client' && row.client >= (demand[id] ?? 0)) return split
  if (to === 'silo' && splitTotals(split).silo >= siloFree) return split
  if (leftBehind(split, cargo, id) > 0) return { ...split, [id]: { ...row, [to]: row[to] + 1 } }
  const from: HomeDestination = to === 'client' ? 'silo' : 'client'
  if (row[from] <= 0) return split
  return { ...split, [id]: { ...row, [from]: row[from] - 1, [to]: row[to] + 1 } }
}

/** Take one unit of `id` out of `from`; it stays behind. */
export function releaseUnit(split: HomeSplit, id: string, from: HomeDestination): HomeSplit {
  const row = split[id]
  if (!row || row[from] <= 0) return split
  return { ...split, [id]: { ...row, [from]: row[from] - 1 } }
}

export function splitTotals(split: HomeSplit): Record<HomeDestination, number> {
  const t = { client: 0, silo: 0 }
  for (const row of Object.values(split)) { t.client += row.client; t.silo += row.silo }
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

/**
 * Settle the split. Silo units stay in the stash; units that fit neither the
 * contract nor the silo are taken out of it. The client portion is returned for
 * the debrief ledger to consume, and the haul is marked settled so the free-haul
 * step in the debrief does not run again.
 */
export function applyHomeSplit(s: GameState, split: HomeSplit, cargo: Record<string, number>, terms: { payout: number; affinity: number } = { payout: 0, affinity: 0 }): { state: GameState; consumed: Record<string, number> } {
  const left: Record<string, number> = {}
  const stash = { ...(s.player.stash ?? {}) }
  for (const id of Object.keys(cargo)) {
    const n = leftBehind(split, cargo, id)
    if (n <= 0) continue
    left[id] = n
    stash[id] = Math.max(0, (stash[id] ?? 0) - n)
    if (stash[id] <= 0) delete stash[id]
  }
  const consumed = pick(split, 'client')
  // SSL-751: the run stays open on the debrief, which reads this ledger and closes it.
  const homeSettlement: HomeSettlement = { payout: terms.payout, affinity: terms.affinity, consumed, siloed: pick(split, 'silo'), left }
  return {
    state: { ...s, player: { ...s.player, stash, homeDeliveryPending: false, homeSettlement, cargoSettledOffworld: true } },
    consumed,
  }
}
