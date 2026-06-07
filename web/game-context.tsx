'use client'

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import { type Mission, type Target, type RocketConfig, MISSIONS, TARGETS, PROGRESSION_STEPS, suggestBuild } from '@/lib/data'
import { pbShared } from '@/lib/pb'
import { type Catalog, STATIC_CATALOG, fetchCatalog } from '@/lib/catalog'

export type Screen =
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

export interface Player {
  francs: number
  level: number
  xp: number
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
}

interface GameActions {
  catalog: Catalog
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
  onDebriefDone: (total: number, xp: number, affinity: number) => void
  coachManualNext: () => void
  completeStep: (id: number) => void
  resetGame: () => void
  buildControlStation: () => void
  classifyCandidate: (verdict: 'planet' | 'not_planet') => void
  mission: Mission | null
  target: Target | null
}

const GameContext = createContext<(GameState & GameActions) | null>(null)

const DEFAULT_STATE: GameState = {
  screen: 'build',
  player: {
    francs: 10_000_000_000,
    level: 1,
    xp: 0,
    activeMission: null,
    missionCount: 1,
    pendingLaunch: false,
    placed: [],
    placementPlots: {},
    controlBuilt: false,
    missionsDone: 0,
    freeOperations: false,
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
}

const STORAGE_KEY = 'landnam-game-state-v1'

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
  const [hydrated, setHydrated] = useState(false)
  const [catalog, setCatalog] = useState<Catalog>(STATIC_CATALOG)
  const [authUserId, setAuthUserId] = useState<string | null>(pbShared.authStore.record?.id ?? null)
  const backendRecordId = useRef<string | null>(null)
  const backendLoadedFor = useRef<string | null>(null)

  useEffect(() => {
    setState(loadState())
    setHydrated(true)
  }, [])

  useEffect(() => {
    fetchCatalog().then(setCatalog).catch(() => {})
  }, [])

  useEffect(() => pbShared.authStore.onChange((_token, record) => {
    backendRecordId.current = null
    backendLoadedFor.current = null
    setAuthUserId(record?.id ?? null)
  }), [])

  useEffect(() => {
    if (!hydrated || !authUserId || backendLoadedFor.current === authUserId) return
    let active = true
    pbShared.collection('game_states')
      .getFirstListItem(`user = "${authUserId}"`)
      .then(record => {
        if (!active) return
        backendRecordId.current = record.id
        backendLoadedFor.current = authUserId
        const remoteState = record.state as Partial<GameState>
        setState(current => ({ ...current, ...remoteState }))
      })
      .catch(error => {
        if (!active) return
        if (typeof error === 'object' && error && 'status' in error && error.status === 404) {
          backendLoadedFor.current = authUserId
        }
      })
    return () => { active = false }
  }, [authUserId, hydrated])

  useEffect(() => {
    if (!hydrated) return
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  }, [state, hydrated])

  useEffect(() => {
    if (!hydrated || !authUserId || backendLoadedFor.current !== authUserId) return
    const timer = window.setTimeout(async () => {
      const payload = { user: authUserId, state }
      try {
        if (backendRecordId.current) {
          await pbShared.collection('game_states').update(backendRecordId.current, payload)
        } else {
          const record = await pbShared.collection('game_states').create(payload)
          backendRecordId.current = record.id
        }
      } catch {
        // Local storage remains the offline source of truth until the data link recovers.
      }
    }, 400)
    return () => window.clearTimeout(timer)
  }, [authUserId, hydrated, state])

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

  const onPickMission = useCallback((id: string) => {
    setState(s => ({
      ...s,
      missionId: id,
      targetId: null,
      classification: null,
      screen: catalog.missions.find(m => m.id === id)?.requiresClassification ? 'classify' : 'targets',
      doneSteps: { ...s.doneSteps, 2: true },
    }))
  }, [catalog.missions])

  const classifyCandidate = useCallback((verdict: 'planet' | 'not_planet') => {
    setState(s => ({
      ...s,
      classification: { candidateId: 'tess-451b', verdict },
      targetId: 'tess-451b',
      rocket: suggestBuild({
        mission: s.missionId ? catalog.missions.find(m => m.id === s.missionId) ?? null : null,
        target: catalog.targets.find(t => t.id === 'tess-451b') ?? null,
        level: s.player.level,
        parts: catalog.parts,
      }),
      screen: 'fab',
      doneSteps: { ...s.doneSteps, 30: true, 3: true },
    }))

    const userId = pbShared.authStore.record?.id
    if (userId) {
      void pbShared.collection('classifications').create({
        user: userId,
        candidate: 'tess-451b',
        verdict,
      }).catch(() => undefined)
    }
  }, [])

  const onPickTarget = useCallback((id: string) => {
    setState(s => {
      const mission = s.missionId ? catalog.missions.find(m => m.id === s.missionId) ?? null : null
      const target = catalog.targets.find(t => t.id === id) ?? null
      const next = suggestBuild({ mission, target, level: s.player.level, parts: catalog.parts })
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
  }, [])

  const onMiningDone = useCallback((cargo: Record<string, number>) => {
    setState(s => ({
      ...s,
      lastCargo: cargo,
      screen: 'debrief',
      doneSteps: { ...s.doneSteps, 6: true },
    }))
  }, [])

  const onDebriefDone = useCallback((total: number, xp: number) => {
    setState(s => {
      const missionsDone = s.player.missionsDone + 1
      const freeOperations = missionsDone >= 4
      return {
        ...s,
        player: {
          ...s.player,
          francs: s.player.francs + total,
          xp: s.player.xp + xp,
          activeMission: null,
          missionsDone,
          missionCount: freeOperations ? MISSIONS.length : Math.max(0, Math.min(1, MISSIONS.length - missionsDone)),
          freeOperations,
        },
        lastCargo: null,
        missionId: null,
        targetId: null,
        tutorial: !freeOperations,
        popup: missionsDone === 1 ? 'sr2' : freeOperations ? 'freeops' : s.popup,
        doneSteps: { ...s.doneSteps, 9: true },
        screen: missionsDone === 1 || freeOperations ? s.screen : 'hub',
      }
    })
  }, [])

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
      pbShared.collection('game_states').delete(backendRecordId.current)
        .catch(() => {})
      backendRecordId.current = null
    }
  }, [authUserId])

  const buildControlStation = useCallback(() => {
    const cost = 500_000_000
    setState(s => {
      if (s.player.francs < cost || s.player.controlBuilt) return s
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
  }, [])

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
      mission,
      target,
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
