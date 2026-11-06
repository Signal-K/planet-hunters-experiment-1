import { useEffect, useRef } from 'react'
import type { MutableRefObject } from 'react'
import type { GameState } from '@/lib/game-types'
import { friendGiftInbox } from '@/lib/friends/client'
import { wasAway, withWelcomeBack } from '@/lib/systems/WelcomeBack'

const STAMP_EVERY_MS = 60_000

/**
 * Keeps `lastVisitAt` fresh and decides, once per session, whether this is a
 * return after 4+ hours away. The result is `returnedSince`: the old visit
 * stamp when the player returned, otherwise undefined. Market moves, finished
 * builds and the telescope digest feed the card through their own paths; gifts
 * are looked up here.
 */
export function useWelcomeBack(
  stateRef: MutableRefObject<GameState>,
  setState: React.Dispatch<React.SetStateAction<GameState>>,
  hydrated: boolean,
  isPreview: boolean,
  signedIn: boolean,
): MutableRefObject<number | undefined> {
  const returnedSince = useRef<number | undefined>(undefined)
  const decided = useRef(false)

  useEffect(() => {
    if (!hydrated || isPreview) return
    if (!decided.current) {
      decided.current = true
      const last = stateRef.current.player.lastVisitAt
      returnedSince.current = wasAway(last) ? last : undefined
      // The card belongs to this return; late sources only merge while it is open.
      const since = returnedSince.current
      if (since !== undefined) setState(current => ({ ...current, player: { ...current.player, welcomeBack: withWelcomeBack(current.player.welcomeBack, since, {}) } }))
    }
    const stamp = () => setState(current => ({ ...current, player: { ...current.player, lastVisitAt: Date.now() } }))
    stamp()
    const timer = window.setInterval(() => { if (document.visibilityState === 'visible') stamp() }, STAMP_EVERY_MS)
    const onHide = () => { if (document.visibilityState === 'hidden') stamp() }
    document.addEventListener('visibilitychange', onHide)
    window.addEventListener('pagehide', stamp)
    return () => {
      window.clearInterval(timer)
      document.removeEventListener('visibilitychange', onHide)
      window.removeEventListener('pagehide', stamp)
    }
  }, [hydrated, isPreview, setState, stateRef])

  useEffect(() => {
    const since = returnedSince.current
    if (!hydrated || isPreview || !signedIn || since === undefined) return
    let active = true
    void friendGiftInbox().then(({ gifts }) => {
      const fresh = gifts.filter(gift => Date.parse(gift.receivedAt) > since).length
      if (!active || fresh === 0) return
      setState(state => state.player.welcomeBack?.since !== since ? state
        : { ...state, player: { ...state.player, welcomeBack: withWelcomeBack(state.player.welcomeBack, since, { gifts: fresh }) } })
    }).catch(() => {})
    return () => { active = false }
  }, [hydrated, isPreview, signedIn, setState])

  return returnedSince
}
