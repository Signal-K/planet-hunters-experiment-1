// @vitest-environment jsdom

import React, { act, useEffect, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { describe, expect, it } from 'vitest'

import { useUIActions } from './useUIActions'
import { DEFAULT_STATE } from '@/lib/game-state'
import type { GameState, Screen } from '@/lib/game-types'

interface UiHandle {
  screen: Screen
  transition: (screen: Screen) => void
  goBack: (fallback?: Screen) => void
}

function UiHarness({ onReady }: { onReady: (handle: UiHandle) => void }) {
  const [state, setState] = useState<GameState>({ ...DEFAULT_STATE, screen: 'hub' })
  const ui = useUIActions(setState)
  const priorScreen = useRef<Screen | null>(null)

  useEffect(() => {
    if (priorScreen.current !== null) ui.recordScreenTransition(priorScreen.current, state.screen)
    priorScreen.current = state.screen
  }, [state.screen, ui.recordScreenTransition])

  useEffect(() => {
    onReady({
      screen: state.screen,
      transition: screen => setState(current => ({ ...current, screen })),
      goBack: ui.goBack,
    })
  }, [onReady, state.screen, ui.goBack])

  return null
}

describe('useUIActions navigation trail', () => {
  it('returns through direct mission-state transitions one screen at a time', async () => {
    const host = document.createElement('div')
    const root = createRoot(host)
    const handleRef: { current: UiHandle | null } = { current: null }
    ;(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true

    await act(async () => {
      root.render(<UiHarness onReady={handle => { handleRef.current = handle }} />)
    })
    for (const screen of ['missions', 'targets', 'rocket-buy'] as const) {
      await act(async () => { handleRef.current?.transition(screen) })
    }

    await act(async () => { handleRef.current?.goBack() })
    expect(handleRef.current?.screen).toBe('targets')
    await act(async () => { handleRef.current?.goBack() })
    expect(handleRef.current?.screen).toBe('missions')
    await act(async () => { handleRef.current?.goBack() })
    expect(handleRef.current?.screen).toBe('hub')

    await act(async () => root.unmount())
  })

  it('returns from Missions to Launchpad, not to a stale earlier screen', async () => {
    const host = document.createElement('div')
    const root = createRoot(host)
    const handleRef: { current: UiHandle | null } = { current: null }
    ;(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true

    await act(async () => {
      root.render(<UiHarness onReady={handle => { handleRef.current = handle }} />)
    })
    // hub -> launchpad -> missions (mirrors opening "Available Contracts"
    // from the Launchpad's New Mission menu), then Back from Missions.
    for (const screen of ['launchpad', 'missions'] as const) {
      await act(async () => { handleRef.current?.transition(screen) })
    }

    await act(async () => { handleRef.current?.goBack() })
    expect(handleRef.current?.screen).toBe('launchpad')

    await act(async () => root.unmount())
  })
})
