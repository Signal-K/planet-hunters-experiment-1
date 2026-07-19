'use client'

import React, { createContext, useContext, useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import type { Screen, GameState, GameActions } from '@/lib/game-types'
import { MISSIONS, TARGETS, getLaserChargeCap, type Contractor, type Mission, type Target } from '@/lib/data'
import { DEFAULT_STATE, loadState, normalizeAndRepair } from '@/lib/game-state'
import { resolvePreset } from '@/lib/devPresets'
import { pbShared } from '@/lib/pb'
import { identifyUser } from '@/lib/posthog'
import { enqueueSurvey } from '@/lib/surveys'
import { useUIActions } from '@/lib/contexts/useUIActions'
import { useAuthSync } from '@/lib/contexts/useAuthSync'
import { useConfirmedDiscoveryPoll } from '@/lib/contexts/useConfirmedDiscoveryPoll'
import { useCatalogSync } from '@/lib/contexts/useCatalogSync'
import { useGameLoop } from '@/lib/contexts/useGameLoop'
import { useTutorialActions } from '@/lib/contexts/useTutorialActions'
import { useEconomyActions } from '@/lib/contexts/useEconomyActions'

export type { Screen, Player, GameState } from '@/lib/game-types'

// ── State shape helpers ────────────────────────────────────────────────────────

const STORAGE_KEY = 'landnam-game-state-v1'
const STORY_MISSION_CONTRACTOR_ID = 'mission-control'
const TRANSIT_TELESCOPE_TARGET_ID = 'earth-orbit-transit-telescope'
const TRANSIT_TELESCOPE_MISSION_ID = 'story-transit-telescope-launch'

const MISSION_CONTROL_CONTRACTOR: Contractor = {
  id: STORY_MISSION_CONTRACTOR_ID,
  name: 'Mission Control',
  color: '#7ec8ff',
  initial: 'MC',
  unlockTier: 0,
  projectType: 'Story mission',
  mineralPreferences: [],
  payoutPremium: 0,
  affinityBonusPerMission: 0,
  uiRole: 'command',
}

const TRANSIT_TELESCOPE_TARGET: Target = {
  id: TRANSIT_TELESCOPE_TARGET_ID,
  name: 'Earth Orbit',
  type: 'planet',
  orbit: 1,
  difficulty: 'L1',
  brief: 'Low Earth orbit deployment lane for a transit telescope monitored from the Earth-base SMS.',
  minerals: [],
}

// ── Context ────────────────────────────────────────────────────────────────────

const GameContext = createContext<(GameState & GameActions) | null>(null)

export function GameProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<GameState>(DEFAULT_STATE)
  const stateRef = useRef(state)
  stateRef.current = state

  const [hydrated, setHydrated] = useState(false)
  const isPreview = useRef(false)

  // ── Hydration ──────────────────────────────────────────────────────────────
  useEffect(() => {
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
    setState(loadState(STORAGE_KEY))
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
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  }, [state, hydrated])

  const router = useRouter()

  // ── Domain hooks ───────────────────────────────────────────────────────────
  const ui      = useUIActions(setState)
  const auth    = useAuthSync({ state, setState, stateRef, hydrated, isPreview: isPreview.current, addToast: ui.addToast, normalizeAndRepair, storageKey: STORAGE_KEY })
  useConfirmedDiscoveryPoll({ stateRef, setState, hydrated, addToast: ui.addToast })
  const { catalog } = useCatalogSync(state, setState, hydrated, isPreview.current, ui.addToast)
  const runtimeCatalog = useMemo(() => {
    const discoveredTargets = Object.values(state.player.discoveredExoplanetTargets ?? {})
    const shouldOfferTransitTelescopeMission = state.player.freeOperations && state.player.satelliteMonitoringBuilt && !state.player.transitSatelliteLaunchedAt
    const hasActiveTransitTelescopeMission = state.missionId === TRANSIT_TELESCOPE_MISSION_ID || state.targetId === TRANSIT_TELESCOPE_TARGET_ID
    const shouldIncludeTransitTelescopeMission = shouldOfferTransitTelescopeMission || hasActiveTransitTelescopeMission
    if (discoveredTargets.length === 0 && !shouldIncludeTransitTelescopeMission) return catalog

    const existingTargetIds = new Set(catalog.targets.map(target => target.id))
    const mergedTargets = [
      ...catalog.targets,
      ...(shouldIncludeTransitTelescopeMission && !existingTargetIds.has(TRANSIT_TELESCOPE_TARGET.id) ? [TRANSIT_TELESCOPE_TARGET] : []),
      ...discoveredTargets.filter(target => !existingTargetIds.has(target.id)),
    ]
    const existingMissionIds = new Set(catalog.missions.map(mission => mission.id))
    const transitTelescopeMission: Mission[] = shouldIncludeTransitTelescopeMission && !existingMissionIds.has(TRANSIT_TELESCOPE_MISSION_ID)
      ? [{
          id: TRANSIT_TELESCOPE_MISSION_ID,
          title: 'Launch Transit Telescope',
          brief: 'Mission Control authorizes a story operation to place a TESS-class telescope in Earth orbit. This is not a client request.',
          contractor: STORY_MISSION_CONTRACTOR_ID,
          tag: 'STORY',
          difficulty: 'L1',
          locked: false,
          sequence: state.player.missionsDone + 1,
          unlockAt: 'Build Satellite Monitoring Station',
          targetId: TRANSIT_TELESCOPE_TARGET_ID,
          payload: {
            type: 'satellite',
            name: 'Transit Telescope',
            cargoCost: 0,
          },
          requires: {
            minerals: {},
            cargo_min: 0,
            drill_tier: 1,
            max_orbit: 1,
          },
          payout: {
            francs: 150_000,
            affinity: 0,
          },
        }]
      : []
    const surveyMissions: Mission[] = discoveredTargets
      .map((target, index) => ({
        id: `exo-survey-${target.id}`,
        title: `${target.name} survey flight`,
        brief: `Follow up the satellite discovery with a crewed survey mission to ${target.name}. This target is plotted in the star map.`,
        contractor: 'lumen-research',
        tag: 'SCIENCE',
        difficulty: target.difficulty,
        locked: false,
        sequence: state.player.missionsDone + 1,
        unlockAt: 'Classify a satellite candidate',
        targetId: target.id,
        requires: {
          minerals: {},
          cargo_min: 0,
          drill_tier: 1,
          max_orbit: target.orbit,
        },
        payout: {
          francs: 500_000 + index * 75_000,
          affinity: 6,
        },
      }))
      .filter(mission => !existingMissionIds.has(mission.id))

    return {
      ...catalog,
      contractors: {
        ...catalog.contractors,
        ...(shouldIncludeTransitTelescopeMission ? { [STORY_MISSION_CONTRACTOR_ID]: MISSION_CONTROL_CONTRACTOR } : {}),
      },
      targets: mergedTargets,
      missions: [...catalog.missions, ...transitTelescopeMission, ...surveyMissions],
    }
  }, [catalog, state.missionId, state.player.discoveredExoplanetTargets, state.player.freeOperations, state.player.missionsDone, state.player.satelliteMonitoringBuilt, state.player.transitSatelliteLaunchedAt, state.targetId])
  const loop    = useGameLoop({ stateRef, setState, catalog: runtimeCatalog, addToast: ui.addToast })
  const tutorial = useTutorialActions(setState)
  const economy = useEconomyActions(setState, useCallback(() => runtimeCatalog.missions, [runtimeCatalog.missions]))

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
       ?? state.player.dailyContractorPool?.missions.find(m => m.id === state.missionId)
       ?? null)
    : null
  const target = state.targetId ? runtimeCatalog.targets.find(t => t.id === state.targetId) ?? null : null

  return (
    <GameContext.Provider value={{
      ...state,
      catalog: runtimeCatalog,
      hydrated,
      authUserId: auth.authUserId,
      landnamSynced: auth.landnamSynced,
      mission,
      target,
      toasts: ui.toasts,
      addToast: ui.addToast,
      laserChargeCap: getLaserChargeCap(state.player.unlockedSkillNodes ?? []),
      // UI
      go: ui.go,
      setScreenFromUrl: ui.setScreenFromUrl,
      setPopup: ui.setPopup,
      setMenuOpen: ui.setMenuOpen,
      dismissToast: ui.dismissToast,
      clearTerritoryClaimPopup: ui.clearTerritoryClaimPopup,
      // Auth
      upgradePromptOpen: auth.upgradePromptOpen,
      dismissUpgradePrompt: auth.dismissUpgradePrompt,
      upgradeAccount: auth.upgradeAccount,
      awaitingRemoteState: auth.awaitingRemoteState,
      authGateOpen: auth.authGateOpen,
      authGateError: auth.authGateError,
      signInFromGate: auth.signInFromGate,
      createAccountFromGate: auth.createAccountFromGate,
      skipAuthGate: auth.skipAuthGate,
      resetGame: useCallback(() => auth.resetGame(DEFAULT_STATE), [auth.resetGame]), // eslint-disable-line react-hooks/rules-of-hooks
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
      onReturnArrived: loop.onReturnArrived,
      onRoverMiningDone: loop.onRoverMiningDone,
      onDebriefDone: loop.onDebriefDone,
      gainResearchXP: loop.gainResearchXP,
      upgradeLicenseGrade: loop.upgradeLicenseGrade,
      unlockBlueprint: loop.unlockBlueprint,
      launchTransitSatellite: loop.launchTransitSatellite,
      submitTessClassification: loop.submitTessClassification,
      chooseSatelliteTarget: loop.chooseSatelliteTarget,
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
      upgradeLaunchpad: economy.upgradeLaunchpad,
      buildScanner: economy.buildScanner,
      startScan: economy.startScan,
      collectScan: economy.collectScan,
      unlockSkillNode: economy.unlockSkillNode,
      acceptLoan: economy.acceptLoan,
      abandonMission: economy.abandonMission,
      confirmShipCustomizerBuild: economy.confirmShipCustomizerBuild,
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
