/**
 * What changed on the shared daily market board while the player was away.
 * Computed once, when a newer snapshot replaces the one the player last saw,
 * and stored in the save so the hub can greet them until they wave it off.
 */

import type { DailyEconomySnapshot, DateKey } from './DailyEconomySystem.ts'

export interface EconomyArrivalMove {
  materialId: string
  materialName: string
  /** Whole-percent change in quoted price, signed. */
  changePct: number
}

export interface EconomyArrivalLevelUp {
  clientId: string
  clientName: string
  levelAfter: number
}

export interface EconomyArrival {
  fromDate: DateKey
  toDate: DateKey
  idempotencyKey: string
  moves: EconomyArrivalMove[]
  levelUps: EconomyArrivalLevelUp[]
}

const MAX_MOVES = 2

export function economyArrival(
  previous: DailyEconomySnapshot | undefined,
  next: DailyEconomySnapshot,
): EconomyArrival | null {
  // A first-ever board has nothing to compare against.
  if (!previous || previous.idempotencyKey === next.idempotencyKey) return null

  const moves = Object.values(next.prices)
    .flatMap(quote => {
      const before = previous.prices[quote.materialId]?.price
      if (!before || before <= 0) return []
      const changePct = Math.round(((quote.price - before) / before) * 100)
      return changePct === 0 ? [] : [{ materialId: quote.materialId, materialName: quote.materialName, changePct }]
    })
    .sort((left, right) => Math.abs(right.changePct) - Math.abs(left.changePct) || left.materialId.localeCompare(right.materialId))
    .slice(0, MAX_MOVES)

  // Compare against the board the player last saw, not just the latest day,
  // so a client that levelled while they were away for a week still shows.
  const levelUps = next.clients.flatMap(client => {
    const before = previous.clients.find(prior => prior.clientId === client.clientId)?.levelAfter ?? client.levelBefore
    return client.levelAfter > before ? [{ clientId: client.clientId, clientName: client.clientName, levelAfter: client.levelAfter }] : []
  })

  if (moves.length === 0 && levelUps.length === 0) return null
  return { fromDate: previous.snapshotDate, toDate: next.snapshotDate, idempotencyKey: next.idempotencyKey, moves, levelUps }
}

export function economyArrivalSummary(arrival: EconomyArrival): string {
  const moves = arrival.moves.map(move => `${move.materialName} ${move.changePct > 0 ? '+' : ''}${move.changePct}%`)
  const levels = arrival.levelUps.slice(0, 2).map(client => `${client.clientName} reached level ${client.levelAfter}`)
  const extra = arrival.levelUps.length - levels.length
  const parts = [
    moves.length ? `${moves.join(', ')}.` : '',
    levels.length ? `${levels.join(', ')}${extra > 0 ? ` and ${extra} more` : ''}.` : '',
  ]
  return parts.filter(Boolean).join(' ')
}
