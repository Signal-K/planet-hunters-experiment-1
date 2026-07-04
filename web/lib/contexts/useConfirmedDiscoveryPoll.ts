import { useEffect, useRef } from 'react'
import { fetchLastConfirmed } from '@/lib/tess-subjects'
import type { GameState } from '@/lib/game-types'
import type { Toast } from '@/components/ui/ToastLayer'

// Polls GET /api/ss/subjects/last-confirmed and surfaces an in-app
// notification when a *global* "5 players confirmed a planet" event has
// happened since this player last saw one — letting them re-pick their
// satellite target immediately instead of waiting for the normal daily
// cycle. In-app only (no push/background notifications exist anywhere in
// this ecosystem yet — that's separate, larger follow-up infra). See:
// ~/Navigation/workspace/decisions/citizen-science-consensus-cross-post-and-immediate-repick.md
const POLL_MS = 90_000

interface Opts {
  stateRef: React.RefObject<GameState>
  setState: React.Dispatch<React.SetStateAction<GameState>>
  hydrated: boolean
  addToast: (message: string, kind?: Toast['kind']) => void
}

export function useConfirmedDiscoveryPoll({ stateRef, setState, hydrated, addToast }: Opts) {
  const inFlight = useRef(false)

  useEffect(() => {
    if (!hydrated) return

    const check = async () => {
      if (inFlight.current) return
      inFlight.current = true
      try {
        const { lastConfirmedAt } = await fetchLastConfirmed()
        const player = stateRef.current.player
        if (lastConfirmedAt && lastConfirmedAt !== player.lastSeenConfirmedAt) {
          const alreadyKnew = player.lastSeenConfirmedAt != null
          setState(s => ({
            ...s,
            player: { ...s.player, lastSeenConfirmedAt: lastConfirmedAt, pendingRepick: true },
          }))
          // Don't toast on the very first check after load/reset — that
          // would fire for every historical confirmation on first launch,
          // not just genuinely new ones.
          if (alreadyKnew) {
            addToast('A candidate was just confirmed as a real planet — point the satellite anywhere, right now', 'ok')
          }
        }
      } catch {
        // Non-fatal — silently retry next interval. Not worth surfacing a
        // toast for a background poll failure.
      } finally {
        inFlight.current = false
      }
    }

    check()
    const id = setInterval(check, POLL_MS)
    return () => clearInterval(id)
  }, [hydrated, stateRef, setState, addToast])
}
