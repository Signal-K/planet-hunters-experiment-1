'use client'

import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react'
import type { Screen, Player, GameState, GameActions } from '@/lib/game-types'
import type { Mission, Target, RocketConfig } from '@/lib/data'
import { MISSIONS, TARGETS, getLaserChargeCap } from '@/lib/data'
import { resolvePreset } from '@/lib/devPresets'
import { pbShared } from '@/lib/pb'
import { identifyUser } from '@/lib/posthog'
import { enqueueSurvey } from '@/lib/surveys'
import { useUIActions } from '@/lib/contexts/useUIActions'
import { useAuthSync } from '@/lib/contexts/useAuthSync'
import { useCatalogSync } from '@/lib/contexts/useCatalogSync'
import { useGameLoop } from '@/lib/contexts/useGameLoop'
import { useTutorialActions } from '@/lib/contexts/useTutorialActions'
import { useEconomyActions } from '@/lib/contexts/useEconomyActions'

export type { Screen, Player, GameState } from '@/lib/game-types'

// ── State shape helpers ────────────────────────────────────────────────────────

const STORAGE_KEY = 'landnam-game-state-v1'

const VALID_SCREENS: Screen[] = ['intro', 'build', 'hub', 'missions', 'galaxy', 'targets', 'fab', 'transit', 'mining', 'debrief', 'refinery', 'market', 'hangar', 'rocket-buy', 'skills', 'scan-station', 'rover-mining']
const MISSION_CONTEXT_SCREENS = new Set<Screen>(['targets', 'rocket-buy', 'fab', 'transit', 'mining', 'rover-mining', 'debrief'])
const TARGET_CONTEXT_SCREENS = new Set<Screen>(['rocket-buy', 'fab', 'transit', 'mining', 'rover-mining', 'debrief'])

const DEFAULT_STATE: GameState = {
  screen: 'intro',
  player: {
    francs: 10_000_000_000,
    activeMission: null,
    missionCount: 1,
    pendingLaunch: false,
    placed: [],
    placementPlots: {},
    controlBuilt: false,
    missionsDone: 0,
    skillPoints: 0,
    unlockedSkillNodes: [],
    freeOperations: false,
    contractorMissions: {},
    contractorStreaks: {},
    contractorCooldowns: {},
    researchAnnotations: 0,
    refineryBuilt: false,
    refineryUnlocked: false,
    refineryUnlockNotified: false,
    refineryQueue: [],
    refinedGoods: {},
    launchpadUpgraded: false,
    loanDebt: 0,
    loanOffered: false,
    seen_planets: [],
    roverDeployments: [],
    contractorTerritories: {},
  },
  missionId: null,
  targetId: null,
  rocket: { chassis: 'hull-mk1', propulsion: 'ion-a1', drill: 'hand-drill' },
  lastCargo: null,
  tutorial: true,
  doneSteps: {},
  popup: null,
  menuOpen: false,
}

function normalizeState(input: Partial<GameState>): GameState {
  const screen = input.screen && VALID_SCREENS.includes(input.screen) ? input.screen : DEFAULT_STATE.screen
  const missionId = typeof input.missionId === 'string' ? input.missionId : null
  const targetId = missionId && typeof input.targetId === 'string' ? input.targetId : null
  return {
    ...DEFAULT_STATE,
    ...input,
    screen,
    missionId,
    targetId,
    rocket: { ...DEFAULT_STATE.rocket, ...input.rocket },
    player: { ...DEFAULT_STATE.player, ...input.player },
    doneSteps: { ...DEFAULT_STATE.doneSteps, ...input.doneSteps },
  }
}

function repairStateRoute(input: GameState): GameState {
  const mission = input.missionId
    ? (MISSIONS.find(m => m.id === input.missionId)
       ?? input.player.dailyContractorPool?.missions.find(m => m.id === input.missionId)
       ?? null)
    : null
  const target = input.targetId ? TARGETS.find(t => t.id === input.targetId) ?? null : null
  if (MISSION_CONTEXT_SCREENS.has(input.screen) && !mission) {
    return { ...input, screen: 'missions', missionId: null, targetId: null }
  }
  if (TARGET_CONTEXT_SCREENS.has(input.screen) && !target) {
    return { ...input, screen: mission ? 'targets' : 'missions', targetId: null }
  }
  if (input.screen === 'targets' && mission?.targetId) {
    return { ...input, screen: 'rocket-buy', targetId: mission.targetId }
  }
  return input
}

function normalizeAndRepair(partial: Partial<GameState>): GameState {
  return repairStateRoute(normalizeState(partial))
}

function loadState(): GameState {
  if (typeof window === 'undefined') return DEFAULT_STATE
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULT_STATE
    return normalizeAndRepair(JSON.parse(raw) as Partial<GameState>)
  } catch {
    return DEFAULT_STATE
  }
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
    setState(loadState())
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

  // ── Domain hooks ───────────────────────────────────────────────────────────
  const ui      = useUIActions(setState)
  const auth    = useAuthSync({ state, setState, stateRef, hydrated, isPreview: isPreview.current, addToast: ui.addToast, normalizeAndRepair, storageKey: STORAGE_KEY })
  const { catalog } = useCatalogSync(state, setState, hydrated, isPreview.current, ui.addToast)
  const loop    = useGameLoop({ stateRef, setState, catalog, addToast: ui.addToast })
  const tutorial = useTutorialActions(setState)
  const economy = useEconomyActions(setState, useCallback(() => catalog.missions, [catalog.missions]))

  // ── Derived values ─────────────────────────────────────────────────────────
  const mission = state.missionId
    ? (catalog.missions.find(m => m.id === state.missionId)
       ?? state.player.dailyContractorPool?.missions.find(m => m.id === state.missionId)
       ?? null)
    : null
  const target = state.targetId ? catalog.targets.find(t => t.id === state.targetId) ?? null : null

  return (
    <GameContext.Provider value={{
      ...state,
      catalog,
      hydrated,
      authUserId: auth.authUserId,
      mission,
      target,
      toasts: ui.toasts,
      laserChargeCap: getLaserChargeCap(state.player.unlockedSkillNodes ?? []),
      // UI
      go: ui.go,
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
      onRoverMiningDone: loop.onRoverMiningDone,
      onDebriefDone: loop.onDebriefDone,
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
