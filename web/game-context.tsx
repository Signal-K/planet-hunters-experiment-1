'use client'

import React, { createContext, useContext, useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import type { Screen, GameState, GameActions } from '@/lib/game-types'
import { MISSIONS, TARGETS, getLaserChargeCap } from '@/lib/data'
import { DEFAULT_STATE, loadState, normalizeAndRepair } from '@/lib/game-state'
import { buildRuntimeCatalog } from '@/lib/runtimeCatalog'
import { resolvePreset } from '@/lib/devPresets'
import { pbShared } from '@/lib/pb'
import { identifyUser } from '@/lib/posthog'
import { enqueueSurvey } from '@/lib/surveys'
import { readPendingDemoBonus, clearPendingDemoBonus, DEMO_BONUS_FRANCS } from '@/lib/demo-bonus'
import { useUIActions } from '@/lib/contexts/useUIActions'
import { useAuthSync } from '@/lib/contexts/useAuthSync'
import { useConfirmedDiscoveryPoll } from '@/lib/contexts/useConfirmedDiscoveryPoll'
import { useCatalogSync } from '@/lib/contexts/useCatalogSync'
import { useGameLoop } from '@/lib/contexts/useGameLoop'
import { useTutorialActions } from '@/lib/contexts/useTutorialActions'
import { useEconomyActions } from '@/lib/contexts/useEconomyActions'
import { useSurfaceOpsActions } from '@/lib/contexts/useSurfaceOpsActions'
import { useInstrumentFeedNotifications } from '@/lib/contexts/useInstrumentFeedNotifications'
import { useAcademyActions } from '@/lib/contexts/useAcademyActions'
import { deriveSceneScope, EARTH_BASE_SCOPE } from '@/lib/scene-scope'
import { claimFriendGift as claimFriendGiftRequest } from '@/lib/friends/client'
import { applyFriendGiftToPlayer, friendGiftToastMessage } from '@/lib/friends/applyGift'

export type { Screen, Player, GameState } from '@/lib/game-types'

// ── State shape helpers ────────────────────────────────────────────────────────

const STORAGE_KEY = 'landnam-game-state-v1'
// ── Context ────────────────────────────────────────────────────────────────────

const GameContext = createContext<(GameState & GameActions) | null>(null)

export function GameProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<GameState>(DEFAULT_STATE)
  const stateRef = useRef(state)
  stateRef.current = state

  const [hydrated, setHydrated] = useState(false)
  const isPreview = useRef(false)
  const skipNextLocalPersist = useRef(false)
  // React StrictMode double-invokes effects in dev. This effect strips the
  // `?preset=`/`?preview=` query via history.replaceState as one of its own
  // side effects, so a second invocation reads an already-stripped URL and
  // silently falls through to the loadState() branch, discarding the preset
  // it just applied. Guard so only the first invocation's result sticks.
  const hydrationRanOnce = useRef(false)

  // ── Hydration ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (hydrationRanOnce.current) return
    hydrationRanOnce.current = true
    const params = new URLSearchParams(window.location.search)
    const previewScreen = params.get('preview')
    const routePreset = window.location.pathname.endsWith('/game/ship-customizer') ? 'ship-customizer' : null
    const presetName = routePreset ?? params.get('preset')
    if (previewScreen) {
      isPreview.current = true
      setState({
        ...DEFAULT_STATE,
        screen: previewScreen as Screen,
        tutorial: false,
        missionId: MISSIONS[0]?.id ?? null,
        targetId: TARGETS[0]?.id ?? null,
        player: { ...DEFAULT_STATE.player, missionsDone: 1, refineryBuilt: true, placed: ['launchpad', 'refinery'] },
      })
      setHydrated(true)
      return
    }
    if (presetName) {
      const preset = resolvePreset(presetName)
      if (preset) {
        isPreview.current = true
        setState({ ...DEFAULT_STATE, ...preset })
        if (!routePreset) window.history.replaceState({}, '', window.location.pathname)
        setHydrated(true)
        return
      }
    }
    const loadedState = loadState(STORAGE_KEY)
    // `/game` resolves returning players to Earth Base before this provider
    // hydrates. Keep that entry decision authoritative; otherwise hydration
    // restores the previous Contracts screen and the URL-sync effect pushes
    // the player straight back to `/game/missions` (KES-226).
    const entryState = window.location.pathname === '/game/hub'
      ? { ...loadedState, screen: 'hub' as Screen }
      : loadedState
    setState(entryState)
    setHydrated(true)
    const record = pbShared.authStore.record
    if (record?.id) identifyUser(record.id, record.email ? { email: record.email } : undefined)
  }, [])

  // Survey on return visit
  useEffect(() => {
    if (!hydrated || isPreview.current) return
    if (state.player.missionsDone > 0) enqueueSurvey('lnm_return_visit', 3000)
  }, [hydrated]) // eslint-disable-line react-hooks/exhaustive-deps

  // Persist state to localStorage
  useEffect(() => {
    if (!hydrated || isPreview.current) return
    if (skipNextLocalPersist.current) {
      skipNextLocalPersist.current = false
      localStorage.removeItem(STORAGE_KEY)
      return
    }
    // updatedAt (STS-635) is stamped only in the serialized write, not fed back
    // into React state, so this effect can't retrigger itself. It's read back
    // on next load via loadState()/normalizeState() and used as a tie-breaker
    // in mergeRemoteState when local and remote missionsDone are equal.
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...state, updatedAt: Date.now() }))
  }, [state, hydrated])

  const router = useRouter()

  // ── Domain hooks ───────────────────────────────────────────────────────────
  const ui      = useUIActions(setState)

  // Apply a /demo sandbox completion bonus left for this session (KES-264).
  // Runs once per boot, through the same setState path as any other player
  // change, so it's persisted/synced identically — the demo route itself
  // never writes to PocketBase or this context directly.
  useEffect(() => {
    if (!hydrated || isPreview.current) return
    if (!pbShared.authStore.isValid) return
    const pending = readPendingDemoBonus()
    if (!pending) return
    clearPendingDemoBonus()
    if (state.player.demoBonusClaimed?.[pending.track]) return
    setState(s => ({
      ...s,
      player: {
        ...s.player,
        francs: s.player.francs + DEMO_BONUS_FRANCS,
        demoBonusClaimed: { ...s.player.demoBonusClaimed, [pending.track]: true },
      },
    }))
    ui.addToast(`Quick mission bonus: +${DEMO_BONUS_FRANCS}₣`, 'ok')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated])

  const auth    = useAuthSync({
    state,
    setState,
    stateRef,
    hydrated,
    isPreview: isPreview.current,
    addToast: ui.addToast,
    normalizeAndRepair,
    storageKey: STORAGE_KEY,
    beforeReset: () => { skipNextLocalPersist.current = true },
  })
  useConfirmedDiscoveryPoll({
    stateRef,
    setState,
    hydrated,
    enabled: !!auth.authUserId && pbShared.authStore.isValid,
    addToast: ui.addToast,
  })
  const { catalog } = useCatalogSync(state, setState, hydrated, isPreview.current, ui.addToast)
  const runtimeCatalog = useMemo(() => buildRuntimeCatalog({
    catalog,
    discoveredTargets: state.player.discoveredExoplanetTargets,
    freeOperations: state.player.freeOperations,
    transitSatelliteLaunchedAt: state.player.transitSatelliteLaunchedAt,
    missionId: state.missionId,
    targetId: state.targetId,
    missionsDone: state.player.missionsDone,
    player: state.player,
  }), [catalog, state.missionId, state.player, state.targetId])
  const loop    = useGameLoop({ stateRef, setState, catalog: runtimeCatalog, addToast: ui.addToast })
  const tutorial = useTutorialActions(setState)
  const economy = useEconomyActions(setState, useCallback(() => runtimeCatalog.missions, [runtimeCatalog.missions]))
  const surfaceOps = useSurfaceOpsActions(setState, ui.addToast)

  // KES-83: applies a claimed friend gift to local player state through the
  // same setState path (and, for blueprints, the same unlockBlueprint action
  // used elsewhere) every other reward uses — the friends UI never touches
  // player state directly.
  const claimFriendGift = useCallback(async (giftId: string) => {
    const { kind, payload } = await claimFriendGiftRequest(giftId)
    if (kind === 'blueprint' && payload.slug) {
      loop.unlockBlueprint(payload.slug, 0, 0, {})
    } else {
      setState(s => applyFriendGiftToPlayer(s, kind, payload))
    }
    ui.addToast(friendGiftToastMessage(kind, payload), 'ok')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loop.unlockBlueprint])
  const academy = useAcademyActions(stateRef, setState, useCallback(() => runtimeCatalog, [runtimeCatalog]), ui.addToast)
  useInstrumentFeedNotifications({
    // Instrument feeds are shared-backend data. Do not start a background
    // request while the auth restore is still pending (or after logout),
    // otherwise a returning guest can generate a noisy 401 before the gate
    // settles.
    enabled: hydrated && !isPreview.current && !!auth.authUserId && pbShared.authStore.isValid,
    player: state.player,
    setState,
    addToast: ui.addToast,
  })

  // Sync game.screen → URL on every screen change.
  // skipNextUrlSync prevents a loop when the change was triggered BY a URL change.
  useEffect(() => {
    // Before hydration resolves, state.screen is still DEFAULT_STATE's 'intro'
    // regardless of route (preview/preset routes included) — pushing here races
    // the hydration effect's setState and can leave the URL on /game/intro
    // (dropping preview/isPreview routing) before the real screen lands a tick
    // later. Wait for hydration so only the real screen ever reaches the URL.
    if (!hydrated) return
    if (ui.skipNextUrlSync.current) {
      ui.skipNextUrlSync.current = false
      return
    }
    router.push(`/game/${state.screen}`)
  }, [state.screen]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Derived values ─────────────────────────────────────────────────────────
  const mission = state.missionId
    ? (runtimeCatalog.missions.find(m => m.id === state.missionId)
       ?? state.player.dailyClientPool?.missions.find(m => m.id === state.missionId)
       ?? null)
    : null
  const target = state.targetId ? runtimeCatalog.targets.find(t => t.id === state.targetId) ?? null : null
  const sceneScope = state.screen === 'missions'
    ? state.missionBoardScope ?? EARTH_BASE_SCOPE
    : deriveSceneScope({ screen: state.screen, targetId: state.targetId, target })

  return (
    <GameContext.Provider value={{
      ...state,
      catalog: runtimeCatalog,
      hydrated,
      authUserId: auth.authUserId,
      landnamSynced: auth.landnamSynced,
      mission,
      target,
      sceneScope,
      toasts: ui.toasts,
      addToast: ui.addToast,
      laserChargeCap: getLaserChargeCap(state.player.unlockedSkillNodes ?? []),
      // UI
      go: ui.go,
      launchpadView: ui.launchpadView,
      openLaunchpad: ui.openLaunchpad,
      focusLaunchpad: ui.focusLaunchpad,
      goToMissions: ui.goToMissions,
      setScreenFromUrl: ui.setScreenFromUrl,
      setPopup: ui.setPopup,
      setMenuOpen: ui.setMenuOpen,
      dismissToast: ui.dismissToast,
      subsurfaceView: ui.subsurfaceView,
      setSubsurfaceView: ui.setSubsurfaceView,
      clearTerritoryClaimPopup: ui.clearTerritoryClaimPopup,
      // Auth
      awaitingRemoteState: auth.awaitingRemoteState,
      authGateOpen: auth.authGateOpen,
      authGateError: auth.authGateError,
      signInFromGate: auth.signInFromGate,
      createAccountFromGate: auth.createAccountFromGate,
      continueWithEmail: auth.continueWithEmail,
      authGateOtpId: auth.authGateOtpId,
      verifyOtp: auth.verifyOtp,
      resetGame: useCallback(() => { void auth.resetGame(DEFAULT_STATE) }, [auth.resetGame]), // eslint-disable-line react-hooks/rules-of-hooks
      signOut: auth.signOut,
      // Game loop
      setPlayer: loop.setPlayer,
      setMissionId: loop.setMissionId,
      setTargetId: loop.setTargetId,
      setRocket: loop.setRocket,
      setLastCargo: loop.setLastCargo,
      onPickMission: loop.onPickMission,
      onPickTarget: loop.onPickTarget,
      onPurchaseRocket: loop.onPurchaseRocket,
      onLaunch: loop.onLaunch,
      onMiningDone: loop.onMiningDone,
      onDeliveryArrived: loop.onDeliveryArrived,
      onDeliveryUnloadComplete: loop.onDeliveryUnloadComplete,
      onReturnArrived: loop.onReturnArrived,
      onRoverMiningDone: loop.onRoverMiningDone,
      onLandingTouchdown: loop.onLandingTouchdown,
      onRedockComplete: loop.onRedockComplete,
      onDebriefDone: loop.onDebriefDone,
      gainResearchXP: loop.gainResearchXP,
      upgradeLicenseGrade: loop.upgradeLicenseGrade,
      unlockBlueprint: loop.unlockBlueprint,
      claimFriendGift,
      researchAcademy: academy.researchAcademy,
      researchLanding: academy.researchLanding,
      setAcademyFunding: academy.setAcademyFunding,
      hireCrew: academy.hireCrew,
      rehireCrew: academy.rehireCrew,
      startCrewTraining: academy.startCrewTraining,
      startCandidateTraining: academy.startCandidateTraining,
      collectCrewTraining: academy.collectCrewTraining,
      researchCrewModule: academy.researchCrewModule,
      assignCrewToStructure: academy.assignCrewToStructure,
      shareChartsWithClient: academy.shareChartsWithClient,
      launchTransitSatellite: loop.launchTransitSatellite,
      submitTessClassification: loop.submitTessClassification,
      chooseSatelliteTarget: loop.chooseSatelliteTarget,
      submitAsteroidClassification: loop.submitAsteroidClassification,
      // Tutorial
      setTutorial: tutorial.setTutorial,
      skipTutorial: tutorial.skipTutorial,
      setDoneSteps: tutorial.setDoneSteps,
      completeStep: tutorial.completeStep,
      coachManualNext: tutorial.coachManualNext,
      // Economy
      sellMinerals: economy.sellMinerals,
      onStartRefine: economy.onStartRefine,
      onCollectRefined: economy.onCollectRefined,
      placeStructure: economy.placeStructure,
      upgradeLaunchpad: economy.upgradeLaunchpad,
      excavateSubsurface: economy.excavateSubsurface,
      buildSubsurfaceRoom: economy.buildSubsurfaceRoom,
      buildScanner: economy.buildScanner,
      startScan: economy.startScan,
      collectScan: economy.collectScan,
      unlockSkillNode: economy.unlockSkillNode,
      acceptLoan: economy.acceptLoan,
      abandonMission: economy.abandonMission,
      confirmShipCustomizerBuild: economy.confirmShipCustomizerBuild,
      purchaseSiteAccess: surfaceOps.purchaseSiteAccess,
      startFieldOperation: surfaceOps.startFieldOperation,
      buildSettlementLaunchpad: surfaceOps.buildSettlementLaunchpad,
      recordSurfaceMined: surfaceOps.recordSurfaceMined,
      dispatchSurfaceFerry: surfaceOps.dispatchSurfaceFerry,
      retrySurfaceFerry: surfaceOps.retrySurfaceFerry,
      reconcileSurfaceFerry: surfaceOps.reconcileSurfaceFerry,
      acknowledgeSurfaceFerry: surfaceOps.acknowledgeSurfaceFerry,
    }}>
      {children}
    </GameContext.Provider>
  )
}

export function useGame() {
  const ctx = useContext(GameContext)
  if (!ctx) throw new Error('useGame must be used within GameProvider')
  return ctx
}
