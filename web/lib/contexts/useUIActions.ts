import { useRef, useState, useCallback } from 'react'
import type { Toast } from '@/components/ui/ToastLayer'
import type { Screen, GameState } from '@/lib/game-types'
import { EARTH_BASE_SCOPE } from '@/lib/scene-scope'
import type { SceneScope } from '@/lib/scene-scope'
import { isHostScene, resolveLogicalBack, type HostScene } from '@/lib/screen-back'

let toastSeq = 0
function nextToastId() { return `t${++toastSeq}` }

export function useUIActions(
  setState: React.Dispatch<React.SetStateAction<GameState>>,
) {
  const [toasts, setToasts] = useState<Toast[]>([])
  // Set by setScreenFromUrl to tell the URL-sync effect to skip one cycle
  const skipNextUrlSync = useRef(false)
  // Whether Hub is showing its Subsurface half. HubScreen slides between
  // surface/subsurface as one continuous scene without a route change (a
  // real navigation would fight the slide animation and add spurious
  // history entries), so this can't live on `state.screen` — but chrome
  // above HubScreen (mission-alerts gating) still needs to know which half
  // is showing. Ephemeral UI state, not persisted GameState, same as
  // `toasts` above.
  const [subsurfaceView, setSubsurfaceView] = useState(false)
  // Every Launchpad entry is now the physical scene. The retired overview was
  // a generic dashboard that broke the Base's scene-first game flow.
  const [launchpadMissionMenuOpen, setLaunchpadMissionMenuOpen] = useState(false)
  // Last physical place the player stood in (Hub / Launchpad / Academy).
  // Overlay Back uses this instead of visit history, so Launchpad never
  // returns to Hangar. Not persisted — it is chrome, not save data.
  const lastHost = useRef<HostScene>('hub')
  const hangarReturnView = useRef<HostScene>('hub')

  const rememberHost = useCallback((screen: Screen) => {
    if (isHostScene(screen)) lastHost.current = screen
  }, [])

  const go = useCallback((screen: Screen) => {
    setState(s => {
      if (screen === 'hangar') {
        hangarReturnView.current = s.screen === 'launchpad' || s.screen === 'academy'
          ? s.screen
          : 'hub'
      }
      rememberHost(screen)
      return { ...s, screen }
    })
  }, [rememberHost, setState])

  const recordScreenTransition = useCallback((_from: Screen, to: Screen) => {
    rememberHost(to)
  }, [rememberHost])

  const goBack = useCallback((fallback: Screen = 'hub') => {
    setState(s => {
      const destination = resolveLogicalBack({
        current: s.screen,
        fallback,
        lastHost: lastHost.current,
        hangarReturn: hangarReturnView.current,
      })
      rememberHost(destination)
      if (destination === s.screen) return s
      return { ...s, screen: destination }
    })
  }, [rememberHost, setState])

  const openLaunchpad = useCallback(() => {
    setLaunchpadMissionMenuOpen(false)
    rememberHost('launchpad')
    setState(s => ({ ...s, screen: 'launchpad' }))
  }, [rememberHost, setState])

  const openLaunchpadMissionMenu = useCallback(() => {
    setLaunchpadMissionMenuOpen(true)
    rememberHost('launchpad')
    setState(s => ({ ...s, screen: 'launchpad' }))
  }, [rememberHost, setState])

  const returnFromHangar = useCallback(() => {
    const destination = hangarReturnView.current
    rememberHost(destination)
    setState(s => ({ ...s, screen: destination }))
  }, [rememberHost, setState])

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

  // Launchpad's embedded contract view (KES-343) keeps the player on the
  // physical Launchpad scene — "Available Contracts" no longer navigates to
  // a separate screen, it swaps the relay console into the same persistent
  // scene. This still needs to mark the same onboarding checkpoint
  // goToMissions marked and remember the scope the board should filter to,
  // just without the screen change.
  const markContractsOpened = useCallback((scope: SceneScope = EARTH_BASE_SCOPE) => {
    setState(s => ({
      ...s,
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

  return { go, goBack, recordScreenTransition, goToMissions, markContractsOpened, setScreenFromUrl, skipNextUrlSync, setPopup, setMenuOpen, addToast, dismissToast, clearTerritoryClaimPopup, toasts, subsurfaceView, setSubsurfaceView, openLaunchpad, openLaunchpadMissionMenu, launchpadMissionMenuOpen, setLaunchpadMissionMenuOpen, returnFromHangar }
}
