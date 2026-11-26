// @vitest-environment jsdom
import React, { act, StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { TARGETS } from '@/lib/data'
import LandingScreen from './LandingScreen'

vi.mock('./LandingScene', () => ({ default: () => null }))
vi.mock('@/components/ui/useHelp', () => ({ useHelp: () => ({ button: null, layer: null }) }))

afterEach(() => vi.useRealTimers())

describe('landing handoff', () => {
  it('cancels a pending handoff on departure and completes a resumed landing once', async () => {
    vi.useFakeTimers()
    ;(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true
    const done = vi.fn()
    const root = createRoot(document.createElement('div'))
    const scene = <StrictMode><LandingScreen target={TARGETS[0]} mode="descend" onBack={() => {}} onContinue={done} /></StrictMode>
    await act(async () => root.render(scene))
    await act(async () => vi.advanceTimersByTime(750))
    await act(async () => root.unmount())
    await act(async () => vi.advanceTimersByTime(1500))
    expect(done).not.toHaveBeenCalled()

    const resumed = createRoot(document.createElement('div'))
    await act(async () => resumed.render(scene))
    await act(async () => vi.advanceTimersByTime(1500))
    expect(done).toHaveBeenCalledTimes(1)
    await act(async () => resumed.unmount())
  })

  it('finishes an invalid saved clock instead of leaving the landing stalled', async () => {
    vi.useFakeTimers()
    ;(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true
    const done = vi.fn()
    const root = createRoot(document.createElement('div'))
    await act(async () => root.render(<LandingScreen target={TARGETS[0]} mode="descend" startedAt={Number.NaN} onBack={() => {}} onContinue={done} />))
    await act(async () => vi.advanceTimersByTime(1500))
    expect(done).toHaveBeenCalledTimes(1)
    await act(async () => root.unmount())
  })
})
