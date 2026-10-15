import { useEffect } from 'react'
import type { GameState } from '@/lib/game-types'
import { CLIENT_SLOTS } from '@/lib/data/clients'
import { MINERAL_META } from '@/lib/data/minerals'
import { refreshPoolIfStale, todayDateKey } from '@/lib/data/daily-client-missions'

const MIDNIGHT_CHECK_MS = 60_000

/**
 * Keeps the player's daily client pool current: new contracts each calendar day, and more clients as missions are
 * flown. Local only. The pool lives on the player so it saves and syncs with the rest of the state.
 */
export function useDailyClientPoolSync(
  setState: React.Dispatch<React.SetStateAction<GameState>>,
  hydrated: boolean,
  isPreview: boolean,
  active: boolean,
  missionsDone: number,
  clientMissions: Record<string, number> | undefined,
) {
  const affinityKey = JSON.stringify(clientMissions ?? {})
  useEffect(() => {
    if (!hydrated || isPreview || !active) return
    const refresh = () => setState(current => {
      const player = current.player
      const pool = refreshPoolIfStale(player.dailyClientPool, player.missionsDone, CLIENT_SLOTS, MINERAL_META, player.clientMissions ?? {}, todayDateKey())
      return pool === player.dailyClientPool ? current : { ...current, player: { ...player, dailyClientPool: pool } }
    })
    refresh()
    const timer = window.setInterval(refresh, MIDNIGHT_CHECK_MS)
    return () => window.clearInterval(timer)
  }, [hydrated, isPreview, active, missionsDone, affinityKey, setState])
}
