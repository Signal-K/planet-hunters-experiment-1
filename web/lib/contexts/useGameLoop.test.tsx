// @vitest-environment jsdom

import React, { act, useEffect, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { describe, expect, it, vi } from 'vitest'

import { useGameLoop } from './useGameLoop'
import { STATIC_CATALOG } from '@/lib/catalog'
import { buildRuntimeCatalog } from '@/lib/runtimeCatalog'
import { DEFAULT_STATE } from '@/lib/game-state'
import type { GameState } from '@/lib/game-types'

interface LoopHandle {
  state: GameState
  onPickMission: (id: string) => void
  onLaunch: () => void
  resumeMissionRun: (key: string) => void
}

function LoopHarness({ initial, onReady }: { initial: GameState; onReady: (handle: LoopHandle) => void }) {
  const [state, setState] = useState(initial)
  const stateRef = useRef(state)
  useEffect(() => { stateRef.current = state }, [state])
  const catalog = buildRuntimeCatalog({
    catalog: STATIC_CATALOG,
    player: state.player,
    missionsDone: state.player.missionsDone,
    freeOperations: state.player.freeOperations,
  })
  const loop = useGameLoop({ stateRef, setState, catalog, addToast: vi.fn() })
  useEffect(() => {
    onReady({ state, onPickMission: loop.onPickMission, onLaunch: loop.onLaunch, resumeMissionRun: loop.resumeMissionRun })
  }, [loop.onLaunch, loop.onPickMission, loop.resumeMissionRun, onReady, state])
  return null
}

describe('useGameLoop concurrent mission runs', () => {
  it('parks an active run before setting up another mission, then restores it intact', async () => {
    const activeState: GameState = {
      ...DEFAULT_STATE,
      screen: 'launchpad',
      missionId: 'baseline-extraction',
      targetId: 'eros',
      rocket: { chassis: 'hull-mk1', propulsion: 'ion-a1', drill: 'hand-drill' },
      player: {
        ...DEFAULT_STATE.player,
        freeOperations: true,
        missionsDone: 3,
        placed: ['launchpad'],
        activeMission: { id: 'baseline-extraction', label: 'Baseline extraction → Eros' },
        missionPhase: 'transit',
        transitStartedAt: 1_700_000_000_000,
        arrivalAt: 1_700_000_040_000,
      },
    }
    const host = document.createElement('div')
    const root = createRoot(host)
    const handleRef: { current: LoopHandle | null } = { current: null }
    const onReady = (next: LoopHandle) => { handleRef.current = next }
    ;(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true

    await act(async () => {
      root.render(<LoopHarness initial={activeState} onReady={onReady} />)
    })
    await act(async () => {
      handleRef.current?.onPickMission('freeops-self-directed-mining')
    })

    expect(handleRef.current?.state.player.activeMission).toBeNull()
    expect(handleRef.current?.state.player.pausedMissionRuns).toHaveLength(1)
    expect(handleRef.current?.state.player.pausedMissionRuns?.[0]).toMatchObject({
      missionId: 'baseline-extraction',
      targetId: 'eros',
      missionPhase: 'transit',
    })
    expect(handleRef.current?.state.missionId).toBe('freeops-self-directed-mining')
    expect(handleRef.current?.state.screen).toBe('targets')

    const parkedKey = handleRef.current?.state.player.pausedMissionRuns?.[0]?.key
    expect(parkedKey).toBeTruthy()
    await act(async () => {
      if (parkedKey) handleRef.current?.resumeMissionRun(parkedKey)
    })

    expect(handleRef.current?.state.missionId).toBe('baseline-extraction')
    expect(handleRef.current?.state.targetId).toBe('eros')
    expect(handleRef.current?.state.player.activeMission?.id).toBe('baseline-extraction')
    expect(handleRef.current?.state.screen).toBe('transit')
    await act(async () => root.unmount())
  })

  it('launches a new run without consuming paused missions', async () => {
    const stagedState: GameState = {
      ...DEFAULT_STATE,
      screen: 'fab',
      missionId: 'freeops-self-directed-mining',
      targetId: 'eros',
      rocket: { chassis: 'hull-mk1', propulsion: 'ion-a1', drill: 'hand-drill' },
      player: {
        ...DEFAULT_STATE.player,
        freeOperations: true,
        missionsDone: 3,
        pendingLaunch: true,
        pendingRocketId: 'sr1',
        pausedMissionRuns: [{
          key: 'baseline:1700000000000',
          activeMission: { id: 'baseline-extraction', label: 'Baseline extraction → Eros' },
          missionId: 'baseline-extraction',
          targetId: 'eros',
          rocket: { chassis: 'hull-mk1', propulsion: 'ion-a1', drill: 'hand-drill' },
          lastCargo: null,
          missionPhase: 'transit',
          transitStartedAt: 1_700_000_000_000,
        }],
      },
    }
    const host = document.createElement('div')
    const root = createRoot(host)
    const handleRef: { current: LoopHandle | null } = { current: null }
    const onReady = (next: LoopHandle) => { handleRef.current = next }
    ;(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true

    await act(async () => {
      root.render(<LoopHarness initial={stagedState} onReady={onReady} />)
    })
    await act(async () => {
      handleRef.current?.onLaunch()
    })

    expect(handleRef.current?.state.player.activeMission?.id).toBe('freeops-self-directed-mining')
    expect(handleRef.current?.state.player.pausedMissionRuns).toHaveLength(1)
    expect(handleRef.current?.state.player.pausedMissionRuns?.[0]?.key).toBe('baseline:1700000000000')
    expect(handleRef.current?.state.screen).toBe('transit')
    await act(async () => root.unmount())
  })
})
