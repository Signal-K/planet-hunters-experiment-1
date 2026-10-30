import { useEffect } from 'react'
import type { GameState } from '@/lib/game-types'
import type { DailyEconomySnapshot } from '@/lib/systems/DailyEconomySystem'
import { economyArrival as arrivalSince } from '@/lib/systems/EconomyArrival'
import { pbLandnam } from '@/lib/pb-landnam'

interface DailyEconomyRecord {
  snapshot: DailyEconomySnapshot
}

function isDailyEconomySnapshot(value: unknown): value is DailyEconomySnapshot {
  if (typeof value !== 'object' || value === null) return false
  const snapshot = value as Partial<DailyEconomySnapshot>
  return snapshot.schemaVersion === 1
    && typeof snapshot.snapshotDate === 'string'
    && typeof snapshot.idempotencyKey === 'string'
    && typeof snapshot.prices === 'object'
    && snapshot.prices !== null
}

/**
 * Seeds the local game state from the shared, immutable daily market board.
 * It deliberately never writes to PocketBase: the scheduled publisher owns
 * the snapshot, while a player only consumes its quoted prices and demand
 * explanations. A failed read preserves the prior snapshot for offline play.
 */
export function useDailyEconomySync(
  setState: React.Dispatch<React.SetStateAction<GameState>>,
  hydrated: boolean,
  isPreview: boolean,
) {
  useEffect(() => {
    if (!hydrated || isPreview) return
    let active = true
    void pbLandnam.collection('daily_economy_snapshots')
      .getList<DailyEconomyRecord>(1, 1, { sort: '-snapshot_date' })
      .then(result => {
        const snapshot = result.items[0]?.snapshot
        if (!active || !isDailyEconomySnapshot(snapshot)) return
        setState(current => {
          const previous = current.player.dailyEconomySnapshot
          if (previous?.idempotencyKey === snapshot.idempotencyKey) return current
          // A quiet new board leaves any unread arrival in place.
          const economyArrival = arrivalSince(previous, snapshot) ?? current.player.economyArrival
          return { ...current, player: { ...current.player, dailyEconomySnapshot: snapshot, economyArrival } }
        })
      })
      .catch(() => {})
    return () => { active = false }
  }, [hydrated, isPreview, setState])
}
