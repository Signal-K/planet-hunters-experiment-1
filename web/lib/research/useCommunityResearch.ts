'use client'

import { useEffect, useState } from 'react'
import { fetchCommunityResearch } from '@/lib/community/client'
import { noteResearchBonus, type CommunityResearch } from '@/lib/research/stamps'
import type { Player } from '@/lib/game-types'

/**
 * SSL-673: fetch the shared monthly research total while `active`, and keep the
 * bonus window it reports on the player so Exchange sells pay it offline too.
 * Offline or signed out, the bar falls back to the player's own stamps.
 */
export function useCommunityResearch(active: boolean, setPlayer: (update: (p: Player) => Player) => void): CommunityResearch | null {
  const [data, setData] = useState<CommunityResearch | null>(null)
  useEffect(() => {
    if (!active) return
    let live = true
    fetchCommunityResearch()
      .then(res => {
        if (!live) return
        setData(res)
        setPlayer(p => noteResearchBonus(p, res.bonusUntil))
      })
      .catch(() => {})
    return () => { live = false }
  }, [active, setPlayer])
  return data
}
