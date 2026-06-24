'use client'

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import type { Toast } from '@/components/ui/ToastLayer'
import { type Screen, type Player, type GameState, type GameActions } from '@/lib/game-types'

export type { Screen, Player, GameState } from '@/lib/game-types'

let toastSeq = 0
function nextToastId() { return `t${++toastSeq}` }
import { type Mission, type Target, type RocketConfig, MISSIONS, TARGETS, PROGRESSION_STEPS, suggestBuild, REFINERY_RECIPES, MINERAL_META, STARTER_ROCKETS, CONTRACTOR_COOLDOWN_MS, CONTRACTOR_STREAK_LIMIT, FREE_OPS_START_MISSIONS_DONE, getLaserChargeCap, travelDurationMs, CONTRACTOR_SLOTS, generateDailyContractorPool, refreshPoolIfStale, todayDateKey } from '@/lib/data'
import { resolvePreset } from '@/lib/devPresets'
import { pbShared } from '@/lib/pb'
import { ensureGuestAuth, hasStoredCredentials, isGuestAccount, upgradeGuestAccount } from '@/lib/guestAuth'
import { pbLandnam } from '@/lib/pb-landnam'
import { type Catalog, STATIC_CATALOG, fetchCatalog } from '@/lib/catalog'
import { enqueueSurvey } from '@/lib/surveys'
import { identifyUser } from '@/lib/posthog'
import { applyTutorialSkip } from '@/lib/tutorial-skip'
import { applyBuildScanner, applyStartScan, applyCollectScan } from '@/lib/systems/ScanSystem'
import { applyMiningDone, applyRoverMiningDone } from '@/lib/systems/MiningSystem'
import { applySellMinerals, applyStartRefine, applyCollectRefined, applyUpgradeLaunchpad } from '@/lib/systems/EconomySystem'
import { applyUnlockSkillNode, applyAcceptLoan, applyAbandonMission } from '@/lib/systems/ProgressionSystem'

const GameContext = createContext<(GameState & GameActions) | null>(null)

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

const ORBIT_MS_PER_UNIT = 2 * 60 * 1000 // 2 minutes per orbit unit

const STORAGE_KEY = 'landnam-game-state-v1'
const UPGRADE_SNOOZE_KEY = 'landnam-upgrade-prompt-snooze-until'
const UPGRADE_SNOOZE_MS = 24 * 60 * 60 * 1000
const LOAN_AMOUNT = 5_000_000_000
const LOAN_REPAYMENT = Math.ceil(LOAN_AMOUNT * 1.08 / 2)
const BANKRUPTCY_THRESHOLD = 500_000_000
const VALID_SCREENS: Screen[] = ['intro', 'build', 'hub', 'missions', 'galaxy', 'targets', 'fab', 'transit', 'mining', 'debrief', 'refinery', 'market', 'hangar', 'rocket-buy', 'skills', 'scan-station', 'rover-mining']

const MISSION_CONTEXT_SCREENS = new Set<Screen>(['targets', 'rocket-buy', 'fab', 'transit', 'mining', 'rover-mining', 'debrief'])
const TARGET_CONTEXT_SCREENS = new Set<Screen>(['rocket-buy', 'fab', 'transit', 'mining', 'rover-mining', 'debrief'])

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

function loadState(): GameState {
  if (typeof window === 'undefined') return DEFAULT_STATE
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULT_STATE
    return repairStateRoute(normalizeState(JSON.parse(raw) as Partial<GameState>))
  } catch {
    return DEFAULT_STATE
  }
}

export function GameProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<GameState>(DEFAULT_STATE)
  const stateRef = useRef(state)
  stateRef.current = state
  const [hydrated, setHydrated] = useState(false)
  const [catalog, setCatalog] = useState<Catalog>(STATIC_CATALOG)
  const [toasts, setToasts] = useState<Toast[]>([])
  const [authUserId, setAuthUserId] = useState<string | null>(pbShared.authStore.record?.id ?? null)
  const backendRecordId = useRef<string | null>(null)
  const backendLoadedFor = useRef<string | null>(null)
  const isPreview = useRef(false)
  const [backendReady, setBackendReady] = useState(false)
  const [upgradePromptOpen, setUpgradePromptOpen] = useState(false)
  const [awaitingRemoteState, setAwaitingRemoteState] = useState(false)
  const [authGateOpen, setAuthGateOpen] = useState(false)
  const [authGateError, setAuthGateError] = useState<string | null>(null)

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

  useEffect(() => {
    fetchCatalog().then(setCatalog).catch(() => {})
  }, [])

  useEffect(() => pbShared.authStore.onChange((_token, record) => {
    backendRecordId.current = null
    backendLoadedFor.current = null
    setBackendReady(false)
    setAuthUserId(record?.id ?? null)
    if (record?.id) identifyUser(record.id, record.email ? { email: record.email } : undefined)
  }), [])

  // Detect returning-user-on-new-device: no local game state but credentials
  // exist (stored guest email or a valid auth record). Show a reconnecting
  // screen instead of the new-player intro until the remote state loads.
  useEffect(() => {
    if (!hydrated || isPreview.current) return
    const noLocalState = !localStorage.getItem(STORAGE_KEY)
    const isReturning = hasStoredCredentials() || pbShared.authStore.isValid
    if (noLocalState && isReturning) setAwaitingRemoteState(true)
  }, [hydrated])

  // Clear once remote state has been merged in (or if we know it never will).
  useEffect(() => {
    if (backendReady) setAwaitingRemoteState(false)
  }, [backendReady])

  // Show an auth gate for brand-new users (no stored credentials, no active
  // session). Returning guests and signed-in users skip straight to the game.
  useEffect(() => {
    if (!hydrated || isPreview.current) return
    if (pbShared.authStore.isValid || hasStoredCredentials()) return
    setAuthGateOpen(true)
  }, [hydrated])

  // Restore a returning guest's session. New users go through the auth gate
  // above and call skipAuthGate() / signInFromGate() instead.
  useEffect(() => {
    if (isPreview.current) return
    if (pbShared.authStore.isValid) return
    if (!hasStoredCredentials()) return
    ensureGuestAuth().catch(() => {
      addToast('Offline mode — progress saved on this device only', 'warn')
      setAwaitingRemoteState(false)
    })
  }, [])

  useEffect(() => {
    if (!hydrated || isPreview.current) return
    if (state.player.missionsDone > 0) enqueueSurvey('lnm_return_visit', 3000)
  }, [hydrated]) // eslint-disable-line react-hooks/exhaustive-deps

  // Initialise / refresh the daily contractor pool when freeOperations unlocks or the calendar day changes.
  useEffect(() => {
    if (!hydrated || isPreview.current || !state.player.freeOperations) return
    const today = todayDateKey()
    if (state.player.dailyContractorPool?.date === today) return
    setState(s => ({
      ...s,
      player: {
        ...s.player,
        dailyContractorPool: refreshPoolIfStale(
          s.player.dailyContractorPool,
          s.player.missionsDone,
          CONTRACTOR_SLOTS,
          MINERAL_META,
        ),
      },
    }))
  }, [hydrated, state.player.freeOperations, state.player.dailyContractorPool?.date]) // eslint-disable-line react-hooks/exhaustive-deps

  // Poll every minute to catch the midnight rollover while the app is open.
  useEffect(() => {
    if (!state.player.freeOperations) return
    const id = setInterval(() => {
      const today = todayDateKey()
      setState(s => {
        if (!s.player.freeOperations || s.player.dailyContractorPool?.date === today) return s
        return {
          ...s,
          player: {
            ...s.player,
            dailyContractorPool: {
              date: today,
              missions: generateDailyContractorPool(today, s.player.missionsDone, CONTRACTOR_SLOTS, MINERAL_META),
              acceptedId: null,
              completedIds: [],
            },
          },
        }
      })
    }, 60_000)
    return () => clearInterval(id)
  }, [state.player.freeOperations])

  // Periodically nudge guest players to save their progress to a full
  // account. Re-checked whenever a mission completes (missionsDone changes)
  // and respects a snooze window set when the player dismisses the prompt.
  useEffect(() => {
    if (!hydrated || isPreview.current) return
    if (state.player.missionsDone < 1) return
    if (!isGuestAccount()) return
    const snoozeUntil = Number(localStorage.getItem(UPGRADE_SNOOZE_KEY) ?? 0)
    if (Date.now() < snoozeUntil) return
    setUpgradePromptOpen(true)
  }, [hydrated, state.player.missionsDone, authUserId])

  useEffect(() => {
    if (!hydrated || isPreview.current || !authUserId || backendLoadedFor.current === authUserId) return
    let active = true

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    function applyRecord(record: any) {
      backendRecordId.current = record.id
      backendLoadedFor.current = authUserId!
      const remoteState = record.state as Partial<GameState>
      setState(current => repairStateRoute(normalizeState({ ...current, ...remoteState })))
      setBackendReady(true)
    }

    // pbLandnam may be cold-starting independently of pbShared (they're
    // separate Fly machines). Retry once after 4 s on network failure.
    pbLandnam.collection('game_states')
      .getFirstListItem(`user = "${authUserId}"`)
      .then(record => { if (active) applyRecord(record) })
      .catch(error => {
        if (!active) return
        if (typeof error === 'object' && error && 'status' in error && error.status === 404) {
          backendLoadedFor.current = authUserId!
          setBackendReady(true)
          return
        }
        // Network error — Landnam backend may still be warming. Retry after 4 s.
        setTimeout(() => {
          if (!active) return
          pbLandnam.collection('game_states')
            .getFirstListItem(`user = "${authUserId}"`)
            .then(record => { if (active) applyRecord(record) })
            .catch(err => {
              if (!active) return
              if (typeof err === 'object' && err && 'status' in err && err.status === 404) {
                backendLoadedFor.current = authUserId!
                setBackendReady(true)
              }
              // Still failing after retry — stay in localStorage-only mode.
            })
        }, 4000)
      })

    return () => { active = false }
  }, [authUserId, hydrated])

  useEffect(() => {
    if (!hydrated || isPreview.current) return
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  }, [state, hydrated])

  useEffect(() => {
    if (!hydrated || isPreview.current || !authUserId || !backendReady || backendLoadedFor.current !== authUserId) return
    const timer = window.setTimeout(async () => {
      const payload = { user: authUserId, state }
      try {
        if (backendRecordId.current) {
          await pbLandnam.collection('game_states').update(backendRecordId.current, payload)
        } else {
          const record = await pbLandnam.collection('game_states').create(payload)
          backendRecordId.current = record.id
        }
      } catch {
        // Local storage remains the offline source of truth until the data link recovers.
      }
    }, 400)
    return () => window.clearTimeout(timer)
  }, [authUserId, hydrated, backendReady, state])

  const go = useCallback((screen: Screen) => {
    setState(s => ({ ...s, screen }))
  }, [])

  const setPlayer: React.Dispatch<React.SetStateAction<Player>> = useCallback(
    (update) => setState(s => ({
      ...s,
      player: typeof update === 'function' ? update(s.player) : update,
    })),
    []
  )

  const setMissionId = useCallback((id: string | null) => {
    setState(s => ({ ...s, missionId: id }))
  }, [])

  const setTargetId = useCallback((id: string | null) => {
    setState(s => ({ ...s, targetId: id }))
  }, [])

  const setRocket = useCallback((r: RocketConfig | ((prev: RocketConfig) => RocketConfig)) => {
    setState(s => ({
      ...s,
      rocket: typeof r === 'function' ? r(s.rocket) : r,
    }))
  }, [])

  const setLastCargo = useCallback((c: Record<string, number> | null) => {
    setState(s => ({ ...s, lastCargo: c }))
  }, [])

  const setTutorial = useCallback((v: boolean) => {
    setState(s => ({ ...s, tutorial: v }))
  }, [])

  const skipTutorial = useCallback((stepIds: number[]) => {
    setState(s => applyTutorialSkip(s, stepIds))
  }, [])

  const setDoneSteps: React.Dispatch<React.SetStateAction<Record<number, boolean>>> = useCallback(
    (update) => setState(s => ({
      ...s,
      doneSteps: typeof update === 'function' ? update(s.doneSteps) : update,
    })),
    []
  )

  const setPopup = useCallback((v: string | null) => {
    setState(s => ({ ...s, popup: v }))
  }, [])

  const setMenuOpen = useCallback((v: boolean) => {
    setState(s => ({ ...s, menuOpen: v }))
  }, [])

  const addToast = useCallback((message: string, kind: Toast['kind'] = 'info') => {
    setToasts(ts => [...ts, { id: nextToastId(), message, kind }])
  }, [])

  const dismissToast = useCallback((id: string) => {
    setToasts(ts => ts.filter(t => t.id !== id))
  }, [])

  const dismissUpgradePrompt = useCallback(() => {
    localStorage.setItem(UPGRADE_SNOOZE_KEY, String(Date.now() + UPGRADE_SNOOZE_MS))
    setUpgradePromptOpen(false)
  }, [])

  const clearTerritoryClaimPopup = useCallback(() => {
    setState(s => ({ ...s, pendingTerritoryClaimFor: undefined, screen: 'market' }))
  }, [])

  useEffect(() => {
    if (!hydrated) return
    if (state.screen !== 'missions' || !state.player.freeOperations || state.player.refineryUnlockNotified) return
    const hasContractorBoard = catalog.missions.some(m => m.id.startsWith('freeops-'))
    if (!hasContractorBoard) return
    setState(s => ({
      ...s,
      player: {
        ...s.player,
        refineryUnlocked: true,
        refineryUnlockNotified: true,
      },
    }))
    addToast('Refinery contracts detected — build the refinery at Earth Base', 'info')
  }, [addToast, catalog.missions, hydrated, state.player.freeOperations, state.player.refineryUnlockNotified, state.screen])

  const upgradeAccount = useCallback(async (email: string, password: string) => {
    const { emailChangeRequested } = await upgradeGuestAccount(email, password)
    localStorage.removeItem(UPGRADE_SNOOZE_KEY)
    setUpgradePromptOpen(false)
    addToast(
      emailChangeRequested
        ? 'Account saved — check your email to confirm your new address'
        : 'Account saved — your new password is active now',
      'ok'
    )
  }, [addToast])

  const onPickMission = useCallback((id: string) => {
    setState(s => {
      if (s.screen !== 'missions') return s
      if (s.player.missionsDone >= 1) enqueueSurvey('lnm_contractor_pick')
      const mission = catalog.missions.find(m => m.id === id)
        ?? s.player.dailyContractorPool?.missions.find(m => m.id === id)
        ?? null
      if (!mission) return s
      const dailyContractorPool = (s.player.dailyContractorPool && id.startsWith('dcp-'))
        ? { ...s.player.dailyContractorPool, acceptedId: id }
        : s.player.dailyContractorPool
      const base = { ...s, player: { ...s.player, dailyContractorPool } }
      if (mission?.targetId) {
        const target = catalog.targets.find(t => t.id === mission.targetId) ?? null
        const next = suggestBuild({ mission, target, missionsDone: s.player.missionsDone, launchpadUpgraded: s.player.launchpadUpgraded, parts: catalog.parts, unlockedSkillNodes: s.player.unlockedSkillNodes ?? [] })
        if (mission.payload?.type === 'rover') next.drill = 'cargo-module-t1'
        return {
          ...base,
          missionId: id,
          targetId: mission.targetId,
          rocket: next,
          screen: 'rocket-buy',
          doneSteps: { ...s.doneSteps, 2: true, 3: true },
        }
      }
      return {
        ...base,
        missionId: id,
        targetId: null,
        screen: 'targets',
        doneSteps: { ...s.doneSteps, 2: true },
      }
    })
  }, [catalog.missions, catalog.parts, catalog.targets])

  const onStartRefine = useCallback((recipeId: string) => {
    const recipe = REFINERY_RECIPES.find(r => r.id === recipeId)
    if (!recipe) return
    setState(s => applyStartRefine(s, recipe))
  }, [])

  const onCollectRefined = useCallback((recipeId: string) => {
    const recipe = REFINERY_RECIPES.find(r => r.id === recipeId)
    if (!recipe) return
    setState(s => applyCollectRefined(s, recipe))
  }, [])

  const upgradeLaunchpad = useCallback(() => { setState(s => applyUpgradeLaunchpad(s)) }, [])

  const buildScanner = useCallback(() => { setState(s => applyBuildScanner(s)) }, [])
  const startScan = useCallback((targetId: string) => { setState(s => applyStartScan(s, targetId)) }, [])
  const collectScan = useCallback(() => { setState(s => applyCollectScan(s)) }, [])

  const sellMinerals = useCallback((mineralId: string, amount: number) => {
    setState(s => applySellMinerals(s, mineralId, amount))
  }, [])

  const onPickTarget = useCallback((id: string) => {
    setState(s => {
      if (s.screen !== 'targets' || !s.missionId) return s
      const mission = s.missionId ? catalog.missions.find(m => m.id === s.missionId) ?? null : null
      const target = catalog.targets.find(t => t.id === id) ?? null
      if (!mission || !target) return s
      const next = suggestBuild({ mission, target, missionsDone: s.player.missionsDone, launchpadUpgraded: s.player.launchpadUpgraded, parts: catalog.parts, unlockedSkillNodes: s.player.unlockedSkillNodes ?? [] })
      return {
        ...s,
        targetId: id,
        rocket: next,
        screen: 'rocket-buy',
        doneSteps: { ...s.doneSteps, 3: true },
      }
    })
  }, [catalog.missions, catalog.parts, catalog.targets])

  const onPurchaseRocket = useCallback((rocketId: string) => {
    setState(s => {
      if (s.screen !== 'rocket-buy' || !s.missionId || !s.targetId) return s
      const rocket = STARTER_ROCKETS.find(r => r.id === rocketId)
      if (!rocket) return s
      if (s.player.francs < rocket.costFrancs) return s
      return {
        ...s,
        player: { ...s.player, francs: s.player.francs - rocket.costFrancs },
        screen: 'fab',
      }
    })
  }, [])

  const onLaunch = useCallback(() => {
    const current = stateRef.current
    if (current.screen !== 'fab' || !current.missionId || !current.targetId) return
    const currentMission = catalog.missions.find(m => m.id === current.missionId)
      ?? current.player.dailyContractorPool?.missions.find(m => m.id === current.missionId)
      ?? null
    const currentTarget = catalog.targets.find(t => t.id === current.targetId) ?? null
    if (!currentMission || !currentTarget) return
    const isFirstEver = current.player.missionsDone === 0
    setState(s => {
      if (s.screen !== 'fab' || !s.missionId || !s.targetId) return s
      const mission = s.missionId
        ? (catalog.missions.find(m => m.id === s.missionId)
           ?? s.player.dailyContractorPool?.missions.find(m => m.id === s.missionId)
           ?? null)
        : null
      const target = s.targetId ? catalog.targets.find(t => t.id === s.targetId) : null
      if (!mission || !target) return s
      const timedTransit = s.player.missionsDone >= FREE_OPS_START_MISSIONS_DONE
      const arrivalAt = (timedTransit && target)
        ? Date.now() + travelDurationMs(target, s.player.unlockedSkillNodes ?? [], ORBIT_MS_PER_UNIT)
        : null
      return {
        ...s,
        player: {
          ...s.player,
          pendingLaunch: false,
          arrivalAt,
          missionPhase: 'transit',
          activeMission: mission && target
            ? { id: mission.id, label: mission.title + ' → ' + target.name }
            : null,
        },
        screen: 'transit',
        doneSteps: { ...s.doneSteps, 5: true },
      }
    })
    if (isFirstEver) enqueueSurvey('lnm_first_launch', 4000)
  }, [catalog.missions, catalog.targets])

  const onMiningDone = useCallback((cargo: Record<string, number>) => {
    setState(s => applyMiningDone(s, cargo))
    addToast('Rocket has returned — cargo secured', 'ok')
    enqueueSurvey('lnm_mining_feel', 2000)
  }, [addToast])

  const onRoverMiningDone = useCallback((cargo: Record<string, number>) => {
    setState(s => applyRoverMiningDone(s, cargo))
    addToast('Rover has returned — minerals secured', 'ok')
  }, [addToast])

  const onDebriefDone = useCallback((total: number, _affinity: number = 0, consumed: Record<string, number> = {}) => {
    const current = stateRef.current
    if (current.screen !== 'debrief' || !current.missionId || !current.targetId || !current.lastCargo) return
    const newMissionsDone = current.player.missionsDone + 1
    setState(s => {
      if (s.screen !== 'debrief' || !s.missionId || !s.targetId || !s.lastCargo) return s
      const missionsDone = s.player.missionsDone + 1
      const mission = s.missionId
        ? (catalog.missions.find(m => m.id === s.missionId)
           ?? s.player.dailyContractorPool?.missions.find(m => m.id === s.missionId)
           ?? null)
        : null
      const missionContractor = mission?.contractor
      const contractor = missionContractor
      const contractorMissions = { ...s.player.contractorMissions }
      const contractorStreaks = { ...(s.player.contractorStreaks ?? {}) }
      const contractorCooldowns = { ...s.player.contractorCooldowns }
      if (contractor) {
        contractorMissions[contractor] = (contractorMissions[contractor] ?? 0) + 1
        const streak = (contractorStreaks[contractor] ?? 0) + 1
        if (streak >= CONTRACTOR_STREAK_LIMIT) {
          contractorStreaks[contractor] = 0
          contractorCooldowns[contractor] = Date.now() + CONTRACTOR_COOLDOWN_MS
        } else {
          contractorStreaks[contractor] = streak
        }
      }
      const stash = { ...(s.player.stash ?? {}) }
      for (const [id, amount] of Object.entries(consumed)) {
        stash[id] = Math.max(0, (stash[id] ?? 0) - amount)
      }
      let loanDebt = s.player.loanDebt
      let francs = s.player.francs + total
      if (loanDebt > 0) {
        const payment = Math.min(LOAN_REPAYMENT, loanDebt)
        francs = Math.max(0, francs - payment)
        loanDebt = Math.max(0, loanDebt - payment)
      }
      const loanOffered = s.player.loanOffered
      const showLoanOffer = !loanOffered && francs < BANKRUPTCY_THRESHOLD && loanDebt === 0
      
      const seen_planets = [...(s.player.seen_planets ?? [])]
      if (s.targetId && !seen_planets.includes(s.targetId)) {
        seen_planets.push(s.targetId)
      }

      const effectiveTargetId = mission?.targetId ?? s.targetId ?? ''
      let roverDeployments = [...(s.player.roverDeployments ?? [])]
      let contractorTerritories = { ...(s.player.contractorTerritories ?? {}) }
      let pendingTerritoryClaimFor: { targetId: string; contractorId: string } | undefined
      if (mission?.payload?.type === 'rover' && contractor && effectiveTargetId) {
        roverDeployments = [...roverDeployments, {
          roverId: `${mission.id}-rover-${Date.now()}`,
          targetId: effectiveTargetId,
          contractorId: contractor,
          timestamp: Date.now(),
        }]
        const prev = contractorTerritories[contractor] ?? []
        if (!prev.includes(effectiveTargetId)) {
          contractorTerritories = { ...contractorTerritories, [contractor]: [...prev, effectiveTargetId] }
        }
        pendingTerritoryClaimFor = { targetId: effectiveTargetId, contractorId: contractor }
      }

      const completedDailyPool = (s.missionId?.startsWith('dcp-') && s.player.dailyContractorPool)
        ? {
          ...s.player.dailyContractorPool,
          acceptedId: null,
          completedIds: [...s.player.dailyContractorPool.completedIds, s.missionId],
        }
        : s.player.dailyContractorPool

      return {
        ...s,
        player: {
          ...s.player,
          francs,
          activeMission: null,
          missionPhase: undefined,
          missionsDone,
          skillPoints: (s.player.skillPoints ?? 0) + 1,
          missionCount: catalog.missions.filter(m => m.sequence === missionsDone + 1).length,
          freeOperations: missionsDone >= FREE_OPS_START_MISSIONS_DONE,
          contractorMissions,
          contractorStreaks,
          contractorCooldowns,
          stash,
          lastContractor: contractor,
          loanDebt,
          loanOffered: loanOffered || showLoanOffer,
          seen_planets,
          roverDeployments,
          contractorTerritories,
          dailyContractorPool: completedDailyPool,
        },
        lastCargo: null,
        missionId: null,
        targetId: null,
        tutorial: missionsDone < FREE_OPS_START_MISSIONS_DONE && catalog.missions.some(m => m.sequence === missionsDone + 1),
        popup: missionsDone === 1 ? 'sr2' : showLoanOffer ? 'loan' : s.popup,
        doneSteps: { ...s.doneSteps, 9: true },
        screen: pendingTerritoryClaimFor ? s.screen : 'market',
        pendingTerritoryClaimFor,
      }
    })
    addToast(`Mission payout received: +${(total / 1_000_000).toFixed(0)}M F`, 'ok')
    enqueueSurvey('lnm_mission_friction', 2000)
    if (newMissionsDone === 1) {
      enqueueSurvey('lnm_m1_complete', 3000)
      enqueueSurvey('lnm_progression_feel', 8000)
    }
    if (newMissionsDone === 2) enqueueSurvey('lnm_m2_complete', 3000)
    if (newMissionsDone === 3) enqueueSurvey('lnm_m3_complete', 5000)
    if (!catalog.missions.some(m => m.sequence === newMissionsDone + 1)) enqueueSurvey('lnm_end_of_content', 5000)
  }, [addToast, catalog.missions])

  const coachManualNext = useCallback(() => {
    setState(s => {
      const stepsHere = s.tutorial
        ? PROGRESSION_STEPS.filter(
            (step) => step.screen === s.screen && !s.doneSteps[step.id]
          )
        : []
      const coach = stepsHere[0]
      if (!coach) return s
      return { ...s, doneSteps: { ...s.doneSteps, [coach.id]: true } }
    })
  }, [])

  const completeStep = useCallback((id: number) => {
    setState(s => ({ ...s, doneSteps: { ...s.doneSteps, [id]: true } }))
  }, [])

  const resetGame = useCallback(() => {
    setState(DEFAULT_STATE)
    localStorage.removeItem(STORAGE_KEY)
    if (authUserId && backendRecordId.current) {
      pbLandnam.collection('game_states').delete(backendRecordId.current)
        .catch(() => {})
      backendRecordId.current = null
    }
  }, [authUserId])

  const abandonMission = useCallback(() => {
    if (!confirm('Abort this mission? You will lose 10% of the mission payout as a penalty.')) return
    setState(s => applyAbandonMission(s, catalog.missions))
  }, [catalog.missions])

  const acceptLoan = useCallback(() => { setState(s => applyAcceptLoan(s)) }, [])

  const unlockSkillNode = useCallback((id: string) => {
    setState(s => applyUnlockSkillNode(s, id))
  }, [])

  const signInFromGate = useCallback(async (email: string, password: string) => {
    setAuthGateError(null)
    try {
      await pbShared.collection('users').authWithPassword(email, password)
      setAuthGateOpen(false)
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Sign in failed'
      setAuthGateError(msg)
      throw new Error(msg)
    }
  }, [])

  const createAccountFromGate = useCallback(async (email: string, password: string) => {
    setAuthGateError(null)
    try {
      await pbShared.collection('users').create({ email, password, passwordConfirm: password, name: '' })
      await pbShared.collection('users').authWithPassword(email, password)
      setAuthGateOpen(false)
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Account creation failed'
      setAuthGateError(msg)
      throw new Error(msg)
    }
  }, [])

  const skipAuthGate = useCallback(() => {
    setAuthGateOpen(false)
    ensureGuestAuth().catch(() => {
      addToast('Offline mode — progress saved on this device only', 'warn')
      setAwaitingRemoteState(false)
    })
  }, [addToast])

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
      authUserId,
      go,
      setPlayer,
      setMissionId,
      setTargetId,
      setRocket,
      setLastCargo,
      setTutorial,
      setDoneSteps,
      skipTutorial,
      setPopup,
      setMenuOpen,
      onPickMission,
      onPickTarget,
      onPurchaseRocket,
      onLaunch,
      onMiningDone,
      onDebriefDone,
      coachManualNext,
      completeStep,
      resetGame,
      upgradeLaunchpad,
      sellMinerals,
      onStartRefine,
      onCollectRefined,
      unlockSkillNode,
      acceptLoan,
      abandonMission,
      buildScanner,
      startScan,
      collectScan,
      onRoverMiningDone,
      toasts,
      dismissToast,
      mission,
      target,
      upgradePromptOpen,
      dismissUpgradePrompt,
      upgradeAccount,
      clearTerritoryClaimPopup,
      awaitingRemoteState,
      authGateOpen,
      authGateError,
      signInFromGate,
      createAccountFromGate,
      skipAuthGate,
      laserChargeCap: getLaserChargeCap(state.player.unlockedSkillNodes ?? []),
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
