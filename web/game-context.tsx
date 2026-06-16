'use client'

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import type { Toast } from '@/components/ui/ToastLayer'

let toastSeq = 0
function nextToastId() { return `t${++toastSeq}` }
import { type Mission, type Target, type RocketConfig, MISSIONS, TARGETS, PROGRESSION_STEPS, suggestBuild, REFINERY_RECIPES, MINERAL_META } from '@/lib/data'
import { resolvePreset } from '@/lib/devPresets'
import { pbShared } from '@/lib/pb'
import { ensureGuestAuth, hasStoredCredentials, isGuestAccount, upgradeGuestAccount } from '@/lib/guestAuth'
import { pbLandnam } from '@/lib/pb-landnam'
import { type Catalog, STATIC_CATALOG, fetchCatalog } from '@/lib/catalog'
import { enqueueSurvey } from '@/lib/surveys'

export type Screen =
  | 'intro'
  | 'build'
  | 'hub'
  | 'missions'
  | 'galaxy'
  | 'targets'
  | 'fab'
  | 'transit'
  | 'mining'
  | 'debrief'
  | 'classify'
  | 'refinery'
  | 'satellite'
  | 'market'

export interface Player {
  francs: number
  activeMission: { id: string; label: string } | null
  missionCount: number
  pendingLaunch: boolean
  placed: string[]
  placementPlots: Record<string, number>
  controlBuilt: boolean
  missionsDone: number
  freeOperations: boolean
  debriefPending?: boolean
  stash?: Record<string, number>
  contractorMissions: Record<string, number>
  contractorCooldowns: Record<string, number>
  researchAnnotations: number
  refineryBuilt: boolean
  refineryQueue: { recipeId: string; startedAt: number }[]
  refinedGoods: Record<string, number>
  launchpadUpgraded: boolean
  lastContractor?: string
  loanDebt: number
  loanOffered: boolean
}

export interface GameState {
  screen: Screen
  player: Player
  missionId: string | null
  targetId: string | null
  rocket: RocketConfig
  lastCargo: Record<string, number> | null
  tutorial: boolean
  doneSteps: Record<number, boolean>
  popup: string | null
  buildGate: boolean
  menuOpen: boolean
  classification: { candidateId: string; verdict: 'planet' | 'not_planet' } | null
  classificationError: string | null
}

interface GameActions {
  catalog: Catalog
  authGateOpen: boolean
  authGateError: string | null
  signInFromGate: (email: string, password: string) => Promise<void>
  createAccountFromGate: (email: string, password: string) => Promise<void>
  skipAuthGate: () => void
  go: (screen: Screen) => void
  setPlayer: React.Dispatch<React.SetStateAction<Player>>
  setMissionId: (id: string | null) => void
  setTargetId: (id: string | null) => void
  setRocket: (r: RocketConfig | ((prev: RocketConfig) => RocketConfig)) => void
  setLastCargo: (c: Record<string, number> | null) => void
  setTutorial: (v: boolean) => void
  setDoneSteps: React.Dispatch<React.SetStateAction<Record<number, boolean>>>
  setPopup: (v: string | null) => void
  setBuildGate: (v: boolean) => void
  setMenuOpen: (v: boolean) => void
  onPickMission: (id: string) => void
  onPickTarget: (id: string) => void
  onLaunch: () => void
  onMiningDone: (cargo: Record<string, number>) => void
  onDebriefDone: (total: number, affinity: number, consumed?: Record<string, number>) => void
  coachManualNext: () => void
  completeStep: (id: number) => void
  resetGame: () => void
  buildControlStation: () => void
  classifyCandidate: (verdict: 'planet' | 'not_planet' | 'unsure', subjectId: string, dipMarkers: number[]) => void
  onSatelliteClassify: (verdict: 'planet' | 'not_planet' | 'unsure') => void
  upgradeLaunchpad: () => void
  sellMinerals: (mineralId: string, amount: number) => void
  onStartRefine: (recipeId: string) => void
  onCollectRefined: (recipeId: string) => void
  acceptLoan: () => void
  abandonMission: () => void
  toasts: Toast[]
  dismissToast: (id: string) => void
  mission: Mission | null
  target: Target | null
  upgradePromptOpen: boolean
  dismissUpgradePrompt: () => void
  upgradeAccount: (email: string, password: string) => Promise<void>
  awaitingRemoteState: boolean
}

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
    freeOperations: false,
    contractorMissions: {},
    contractorCooldowns: {},
    researchAnnotations: 0,
    refineryBuilt: false,
    refineryQueue: [],
    refinedGoods: {},
    launchpadUpgraded: false,
    loanDebt: 0,
    loanOffered: false,
  },
  missionId: null,
  targetId: null,
  rocket: { chassis: 'hull-mk1', propulsion: 'ion-a1', drill: 'hand-drill' },
  lastCargo: null,
  tutorial: true,
  doneSteps: {},
  popup: null,
  buildGate: false,
  menuOpen: false,
  classification: null,
  classificationError: null,
}

const STORAGE_KEY = 'landnam-game-state-v1'
const UPGRADE_SNOOZE_KEY = 'landnam-upgrade-prompt-snooze-until'
const UPGRADE_SNOOZE_MS = 24 * 60 * 60 * 1000
const LOAN_AMOUNT = 5_000_000_000
const LOAN_REPAYMENT = Math.ceil(LOAN_AMOUNT * 1.08 / 2)
const BANKRUPTCY_THRESHOLD = 500_000_000

function firstOpenPlot(placementPlots: Record<string, number>, kinds: string[]) {
  const occupied = new Set(kinds.map(kind => placementPlots[kind]).filter((plot): plot is number => typeof plot === 'number'))
  return [0, 1, 2, 3].find(plot => !occupied.has(plot)) ?? 0
}

function loadState(): GameState {
  if (typeof window === 'undefined') return DEFAULT_STATE
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULT_STATE
    const parsed = JSON.parse(raw) as Partial<GameState>
    return {
      ...DEFAULT_STATE,
      ...parsed,
      player: { ...DEFAULT_STATE.player, ...parsed.player },
    }
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
    const presetName = params.get('preset')
    if (previewScreen) {
      isPreview.current = true
      setState({
        ...DEFAULT_STATE,
        screen: previewScreen as Screen,
        tutorial: false,
        missionId: MISSIONS[0]?.id ?? null,
        targetId: TARGETS[0]?.id ?? null,
        player: { ...DEFAULT_STATE.player, missionsDone: 1, controlBuilt: true, refineryBuilt: true, placed: ['control', 'launchpad', 'refinery', 'satellite'] },
      })
      setHydrated(true)
      return
    }
    if (presetName) {
      const preset = resolvePreset(presetName)
      if (preset) {
        isPreview.current = true
        setState({ ...DEFAULT_STATE, ...preset })
        window.history.replaceState({}, '', window.location.pathname)
        setHydrated(true)
        return
      }
    }
    setState(loadState())
    setHydrated(true)
  }, [])

  useEffect(() => {
    fetchCatalog().then(setCatalog).catch(() => {})
  }, [])

  useEffect(() => pbShared.authStore.onChange((_token, record) => {
    backendRecordId.current = null
    backendLoadedFor.current = null
    setBackendReady(false)
    setAuthUserId(record?.id ?? null)
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
      setState(current => ({ ...current, ...remoteState }))
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

  const setBuildGate = useCallback((v: boolean) => {
    setState(s => ({ ...s, buildGate: v }))
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
    setState(s => ({
      ...s,
      missionId: id,
      targetId: null,
      classification: null,
      screen: catalog.missions.find(m => m.id === id)?.requiresClassification ? 'classify' : 'targets',
      doneSteps: { ...s.doneSteps, 2: true },
    }))
    enqueueSurvey('lnm_contractor_pick')
  }, [catalog.missions])

  const onStartRefine = useCallback((recipeId: string) => {
    const recipe = REFINERY_RECIPES.find(r => r.id === recipeId)
    if (!recipe) return
    setState(s => {
      const stash = { ...(s.player.stash ?? {}) }
      const current = stash[recipe.input.mineral] ?? 0
      if (current < recipe.input.amount || s.player.francs < recipe.cost) return s
      stash[recipe.input.mineral] = current - recipe.input.amount
      return {
        ...s,
        player: {
          ...s.player,
          francs: s.player.francs - recipe.cost,
          stash,
          refineryQueue: [...s.player.refineryQueue, { recipeId, startedAt: Date.now() }],
        },
      }
    })
  }, [])

  const onCollectRefined = useCallback((recipeId: string) => {
    setState(s => {
      const queue = [...s.player.refineryQueue]
      const idx = queue.findIndex(q => q.recipeId === recipeId)
      if (idx < 0) return s
      const started = queue[idx].startedAt
      const recipe = REFINERY_RECIPES.find(r => r.id === recipeId)
      if (!recipe || (Date.now() - started) / 1000 < recipe.time) return s
      queue.splice(idx, 1)
      return {
        ...s,
        player: {
          ...s.player,
          refineryQueue: queue,
          refinedGoods: { ...s.player.refinedGoods, [recipeId]: (s.player.refinedGoods[recipeId] ?? 0) + 1 },
        },
      }
    })
  }, [])

  const classifyCandidate = useCallback((verdict: 'planet' | 'not_planet' | 'unsure', subjectId: string, dipMarkers: number[]) => {
    if (verdict === 'planet') enqueueSurvey('lnm_planet_discovery', 2500)
    setState(s => {
      if (verdict === 'not_planet') {
        return {
          ...s,
          classification: null,
          targetId: null,
          player: { ...s.player },
          screen: 'targets',
          doneSteps: { ...s.doneSteps, 30: true },
        }
      }
      return {
        ...s,
        classification: verdict === 'planet' ? { candidateId: subjectId, verdict } : s.classification,
        targetId: null,
        screen: 'targets',
        doneSteps: { ...s.doneSteps, 30: true },
      }
    })

    const userId = pbShared.authStore.record?.id
    if (userId && subjectId) {
      pbShared.collection('subject_classifications').create({
        subject: subjectId,
        user: userId,
        verdict,
        dip_markers: JSON.stringify(dipMarkers),
        response_time_ms: 0,
      }).then(() => {
        setState(s => ({ ...s, classificationError: null }))
      }).catch((err) => {
        const msg = err?.message ?? err?.status ?? 'Classification write failed'
        setState(s => ({ ...s, classificationError: msg }))
      })
    }
  }, [])

  const onSatelliteClassify = useCallback((verdict: 'planet' | 'not_planet' | 'unsure') => {
    // All verdicts (including unsure) count toward researchAnnotations —
    // participation-based, not accuracy-based. Unsure subjects get routed
    // to more users on the backend via unsure_count weighting.
    setState(s => ({
      ...s,
      player: {
        ...s.player,
        researchAnnotations: s.player.researchAnnotations + 1,
      },
    }))
  }, [])

  const upgradeLaunchpad = useCallback(() => {
    setState(s => {
      if (s.player.launchpadUpgraded || s.player.francs < 1_000_000_000) return s
      return {
        ...s,
        player: {
          ...s.player,
          francs: s.player.francs - 1_000_000_000,
          launchpadUpgraded: true,
        },
      }
    })
  }, [])

  const sellMinerals = useCallback((mineralId: string, amount: number) => {
    setState(s => {
      const stash = { ...(s.player.stash ?? {}) }
      const held = stash[mineralId] ?? 0
      const sellAmount = Math.min(amount, held)
      if (sellAmount <= 0) return s
      const meta = MINERAL_META[mineralId]
      if (!meta) return s
      const revenue = meta.price * sellAmount
      stash[mineralId] = held - sellAmount
      if (stash[mineralId] <= 0) delete stash[mineralId]
      return {
        ...s,
        player: {
          ...s.player,
          francs: s.player.francs + revenue,
          stash,
        },
      }
    })
  }, [])

  const onPickTarget = useCallback((id: string) => {
    setState(s => {
      const mission = s.missionId ? catalog.missions.find(m => m.id === s.missionId) ?? null : null
      const target = catalog.targets.find(t => t.id === id) ?? null
      const next = suggestBuild({ mission, target, missionsDone: s.player.missionsDone, launchpadUpgraded: s.player.launchpadUpgraded, parts: catalog.parts })
      return {
        ...s,
        targetId: id,
        rocket: next,
        screen: 'fab',
        doneSteps: { ...s.doneSteps, 3: true },
      }
    })
  }, [])

  const onLaunch = useCallback(() => {
    const isFirstEver = stateRef.current.player.missionsDone === 0
    setState(s => {
      const mission = s.missionId ? MISSIONS.find(m => m.id === s.missionId) : null
      const target = s.targetId ? TARGETS.find(t => t.id === s.targetId) : null
      return {
        ...s,
        player: {
          ...s.player,
          pendingLaunch: false,
          activeMission: mission && target
            ? { id: mission.id, label: mission.title + ' → ' + target.name }
            : null,
        },
        screen: 'transit',
        doneSteps: { ...s.doneSteps, 5: true },
      }
    })
    if (isFirstEver) enqueueSurvey('lnm_first_launch', 4000)
  }, [])

  const onMiningDone = useCallback((cargo: Record<string, number>) => {
    setState(s => {
      const stash = { ...(s.player.stash ?? {}) }
      for (const [id, amount] of Object.entries(cargo)) {
        stash[id] = (stash[id] ?? 0) + amount
      }
      return {
        ...s,
        lastCargo: cargo,
        player: { ...s.player, stash },
        screen: 'debrief',
        doneSteps: { ...s.doneSteps, 6: true },
      }
    })
    addToast('Rocket has returned — cargo secured', 'ok')
    enqueueSurvey('lnm_mining_feel', 2000)
  }, [addToast])

  const onDebriefDone = useCallback((total: number, _affinity: number = 0, consumed: Record<string, number> = {}) => {
    const newMissionsDone = stateRef.current.player.missionsDone + 1
    setState(s => {
      const missionsDone = s.player.missionsDone + 1
      const freeOperations = missionsDone >= 3
      const mission = s.missionId ? MISSIONS.find(m => m.id === s.missionId) : null
      const missionContractor = mission?.contractor
      const contractor = missionContractor
      const contractorMissions = { ...s.player.contractorMissions }
      const contractorCooldowns = { ...s.player.contractorCooldowns }
      if (contractor) {
        const count = (contractorMissions[contractor] ?? 0) + 1
        contractorMissions[contractor] = count
        if (count >= 2) {
          contractorCooldowns[contractor] = Date.now() + 30 * 60 * 1000
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
      return {
        ...s,
        player: {
          ...s.player,
          francs,
          activeMission: null,
          missionsDone,
          missionCount: freeOperations ? MISSIONS.length : Math.max(0, Math.min(1, MISSIONS.length - missionsDone)),
          freeOperations,
          contractorMissions,
          contractorCooldowns,
          stash,
          lastContractor: contractor,
          loanDebt,
          loanOffered: loanOffered || showLoanOffer,
        },
        lastCargo: null,
        missionId: null,
        targetId: null,
        tutorial: !freeOperations,
        popup: missionsDone === 1 ? 'sr2' : freeOperations ? 'freeops' : showLoanOffer ? 'loan' : s.popup,
        doneSteps: { ...s.doneSteps, 9: true },
        screen: 'market',
      }
    })
    addToast(`Mission payout received: +${(total / 1_000_000).toFixed(0)}M F`, 'ok')
    enqueueSurvey('lnm_mission_friction', 2000)
    if (newMissionsDone === 1) enqueueSurvey('lnm_progression_feel', 8000)
    if (newMissionsDone >= 3) enqueueSurvey('lnm_end_of_content', 5000)
  }, [addToast])

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
    if (!confirm('Are you sure you want to reset all progress?')) return
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
    setState(s => {
      const mission = s.missionId ? MISSIONS.find(m => m.id === s.missionId) : null
      const penalty = mission ? Math.round(mission.payout.francs * 0.1) : 0
      return {
        ...s,
        player: {
          ...s.player,
          francs: Math.max(0, s.player.francs - penalty),
          activeMission: null,
        },
        missionId: null,
        targetId: null,
        screen: 'hub',
      }
    })
  }, [])

  const acceptLoan = useCallback(() => {
    setState(s => ({
      ...s,
      popup: null,
      player: {
        ...s.player,
        francs: s.player.francs + LOAN_AMOUNT,
        loanDebt: s.player.loanDebt + LOAN_AMOUNT * 1.08,
        loanOffered: true,
      },
    }))
  }, [])

  const buildControlStation = useCallback(() => {
    const cost = 500_000_000
    setState(s => {
      if (s.player.francs < cost || s.player.controlBuilt) return s
      addToast('Control Station construction complete', 'ok')
      return {
        ...s,
        buildGate: false,
        player: {
          ...s.player,
          francs: s.player.francs - cost,
          controlBuilt: true,
          missionCount: 1,
          placed: Array.from(new Set([...s.player.placed, 'control'])),
          placementPlots: {
            ...s.player.placementPlots,
            control: firstOpenPlot(s.player.placementPlots, ['launchpad', 'control', 'satellite']),
          },
        },
      }
    })
  }, [addToast])

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

  const mission = state.missionId ? catalog.missions.find(m => m.id === state.missionId) ?? null : null
  const target = state.targetId ? catalog.targets.find(t => t.id === state.targetId) ?? null : null

  return (
    <GameContext.Provider value={{
      ...state,
      catalog,
      go,
      setPlayer,
      setMissionId,
      setTargetId,
      setRocket,
      setLastCargo,
      setTutorial,
      setDoneSteps,
      setPopup,
      setBuildGate,
      setMenuOpen,
      onPickMission,
      onPickTarget,
      onLaunch,
      onMiningDone,
      onDebriefDone,
      coachManualNext,
      completeStep,
      resetGame,
      buildControlStation,
      classifyCandidate,
      onSatelliteClassify,
      upgradeLaunchpad,
      sellMinerals,
      onStartRefine,
      onCollectRefined,
      acceptLoan,
      abandonMission,
      toasts,
      dismissToast,
      mission,
      target,
      upgradePromptOpen,
      dismissUpgradePrompt,
      upgradeAccount,
      awaitingRemoteState,
      authGateOpen,
      authGateError,
      signInFromGate,
      createAccountFromGate,
      skipAuthGate,
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
