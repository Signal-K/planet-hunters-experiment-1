'use client'

import { useEffect, useState } from 'react'
import { fetchCommunityResearch } from '@/lib/community/client'
import type { CommunityResearch } from '@/lib/research/stamps'

/**
 * Fetch the shared monthly research total while `active`. Permanent marketplace
 * effects live on the player, so the old server bonus window is display-only.
 */
export function useCommunityResearch(active: boolean): CommunityResearch | null {
  const [data, setData] = useState<CommunityResearch | null>(null)
  useEffect(() => {
    if (!active) return
    let live = true
    fetchCommunityResearch()
      .then(res => {
        if (!live) return
        setData(res)
      })
      .catch(() => {})
    return () => { live = false }
  }, [active])
  return data
}
