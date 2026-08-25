import { useRef, useState, useCallback } from 'react'
import type { Toast } from '@/components/ui/ToastLayer'
import type { Screen, GameState } from '@/lib/game-types'
import { EARTH_BASE_SCOPE } from '@/lib/scene-scope'
import type { SceneScope } from '@/lib/scene-scope'

let toastSeq = 0
function nextToastId() { return `t${++toastSeq}` }

export function useUIActions(
  setState: React.Dispatch<React.SetStateAction<GameState>>,
) {
  const [toasts, setToasts] = useState<Toast[]>([])
  // Set by setScreenFromUrl to tell the URL-sync effect to skip one cycle
  const skipNextUrlSync = useRef(false)

  const go = useCallback((screen: Screen) => {
    setState(s => ({ ...s, screen }))
  }, [setState])

  // Mission entry is also the first onboarding checkpoint. Keep the route
  // change and checkpoint update in one functional state transition so the
  // callout, launchpad and mission tab cannot race each other or the URL sync.
  const goToMissions = useCallback((scope: SceneScope = EARTH_BASE_SCOPE) => {
    setState(s => ({
      ...s,
      screen: 'missions',
      missionBoardScope: scope,
      doneSteps: { ...s.doneSteps, 1: true },
    }))
  }, [setState])

  // Called by the [screen] page component when the URL changes (browser back/forward).
  // Updates state.screen WITHOUT triggering the URL-sync effect so we don't create
  // a push that fights the navigation.
  const setScreenFromUrl = useCallback((screen: Screen) => {
    setState(s => {
      // A bookmarked /game/build must not resurrect the transient plot picker
      // for an operational base after hydration has already repaired it to
      // Hub. Keep the URL-driven route in the same safe landing state.
      const safeScreen = screen === 'build' && s.player.freeOperations && s.player.placed.length > 0
        ? 'hub'
        : screen
      // Valid URL changes are already represented by the browser history and
      // should not be pushed back. A repaired route, however, must be written
      // back to the canonical URL instead of leaving /game/build rendering a
      // stale screen component forever.
      skipNextUrlSync.current = safeScreen === screen
      return { ...s, screen: safeScreen }
    })
  }, [setState])

  const setPopup = useCallback((v: string | null) => {
    setState(s => ({ ...s, popup: v }))
  }, [setState])

  const setMenuOpen = useCallback((v: boolean) => {
    setState(s => ({ ...s, menuOpen: v }))
  }, [setState])

  const addToast = useCallback((message: string, kind: Toast['kind'] = 'info') => {
    setToasts(ts => [...ts, { id: nextToastId(), message, kind }])
  }, [])

  const dismissToast = useCallback((id: string) => {
    setToasts(ts => ts.filter(t => t.id !== id))
  }, [])

  const clearTerritoryClaimPopup = useCallback(() => {
    setState(s => ({ ...s, pendingTerritoryClaimFor: undefined, screen: s.tutorial ? 'hub' : 'market' }))
  }, [setState])

  return { go, goToMissions, setScreenFromUrl, skipNextUrlSync, setPopup, setMenuOpen, addToast, dismissToast, clearTerritoryClaimPopup, toasts }
}
