import { useEffect } from 'react'
import type { GameState } from '@/lib/game-types'
import { fetchAgencyProgramme } from '@/lib/community/client'
import { pbLandnam } from '@/lib/pb-landnam'

/** Read-only projection of synced agency saves. Saves and research submissions still use the outbox. */
export function useAgencySync(setState: React.Dispatch<React.SetStateAction<GameState>>, hydrated: boolean, isPreview: boolean) {
  useEffect(() => {
    if (!hydrated || isPreview) return
    let cancelled = false
    async function pull() {
      if (!pbLandnam.authStore.token) return
      try {
        const snapshot = await fetchAgencyProgramme()
        if (!cancelled) setState(state => JSON.stringify(state.player.agencyCommunity) === JSON.stringify(snapshot) ? state : { ...state, player: { ...state.player, agencyCommunity: snapshot } })
      } catch { /* The saved frontier remains available offline; it cannot grant research rewards. */ }
    }
    void pull()
    const timer = window.setInterval(() => void pull(), 60_000)
    const unsubscribe = pbLandnam.authStore.onChange(() => void pull())
    return () => { cancelled = true; window.clearInterval(timer); unsubscribe() }
  }, [setState, hydrated, isPreview])
}
