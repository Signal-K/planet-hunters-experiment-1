// @vitest-environment jsdom
import React, { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// KES-148: on the deployed build, the launch cinematic was observed
// replaying from the ground indefinitely and never calling onComplete,
// stranding the player on the fab screen forever. Mock pixi.js/launchScene
// entirely so this test exercises only LaunchSequenceCanvas's own watchdog
// timer, independent of real canvas/WebGL rendering.
let capturedSceneOnComplete: (() => void) | null = null
let capturedTickerCallback: ((t: { deltaMS: number }) => void) | null = null
let mockSceneUpdate = vi.fn()

vi.mock('pixi.js', () => ({
  Application: class {
    init = vi.fn().mockResolvedValue(undefined)
    ticker = { add: vi.fn((cb: (t: { deltaMS: number }) => void) => { capturedTickerCallback = cb }) }
    destroy = vi.fn()
  },
}))

vi.mock('@/lib/pixi/launchScene', () => ({
  LAUNCH_W: 400,
  LAUNCH_H: 300,
  launchFrameDt: (ms: number) => ms / 1000,
  buildLaunchScene: vi.fn((_app: unknown, opts: { onComplete: () => void }) => {
    capturedSceneOnComplete = opts.onComplete
    return { update: mockSceneUpdate }
  }),
}))

import { LaunchSequenceCanvas } from './LaunchSequenceCanvas'

;(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

describe('LaunchSequenceCanvas watchdog', () => {
  let container: HTMLDivElement
  let root: Root

  beforeEach(() => {
    vi.useFakeTimers()
    capturedSceneOnComplete = null
    capturedTickerCallback = null
    mockSceneUpdate = vi.fn()
    container = document.createElement('div')
    document.body.appendChild(container)
  })

  afterEach(() => {
    act(() => root.unmount())
    container.remove()
    vi.useRealTimers()
    vi.clearAllMocks()
  })

  it('fires onComplete on its own after the watchdog ceiling, even if the scene never calls it', async () => {
    const onComplete = vi.fn()
    await act(async () => {
      root = createRoot(container)
      root.render(
        <LaunchSequenceCanvas rocketName="Explorer" targetName="433 Eros" onComplete={onComplete} />
      )
      await vi.advanceTimersByTimeAsync(0)
    })

    expect(onComplete).not.toHaveBeenCalled()

    await act(async () => {
      await vi.advanceTimersByTimeAsync(18_000)
    })

    expect(onComplete).toHaveBeenCalledTimes(1)
  })

  it('does not double-fire if the scene completes naturally right as the watchdog also elapses', async () => {
    const onComplete = vi.fn()
    await act(async () => {
      root = createRoot(container)
      root.render(
        <LaunchSequenceCanvas rocketName="Explorer" targetName="433 Eros" onComplete={onComplete} />
      )
      await vi.advanceTimersByTimeAsync(0)
    })

    await act(async () => {
      capturedSceneOnComplete?.()
      await vi.advanceTimersByTimeAsync(18_000)
    })

    expect(onComplete).toHaveBeenCalledTimes(1)
  })
})

describe('LaunchSequenceCanvas per-frame error isolation (SSL-281)', () => {
  let container: HTMLDivElement
  let root: Root

  beforeEach(() => {
    vi.useFakeTimers()
    capturedSceneOnComplete = null
    capturedTickerCallback = null
    mockSceneUpdate = vi.fn()
    container = document.createElement('div')
    document.body.appendChild(container)
  })

  afterEach(() => {
    act(() => root.unmount())
    container.remove()
    vi.useRealTimers()
    vi.clearAllMocks()
  })

  it('a throwing frame force-completes the sequence instead of silently freezing forever', async () => {
    const onComplete = vi.fn()
    mockSceneUpdate.mockImplementation(() => { throw new Error('boom mid-frame') })
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    await act(async () => {
      root = createRoot(container)
      root.render(
        <LaunchSequenceCanvas rocketName="Explorer" targetName="433 Eros" onComplete={onComplete} />
      )
      await vi.advanceTimersByTimeAsync(0)
    })

    expect(capturedTickerCallback).not.toBeNull()
    expect(onComplete).not.toHaveBeenCalled()

    // Simulate one animation frame whose scene.update() throws — this is the
    // exact mechanism KES-148/SSL-281 hypothesized as the root cause: an
    // uncaught error inside the ticker callback stops PixiJS from scheduling
    // any further frame, hanging the rocket exactly where it was.
    act(() => { capturedTickerCallback?.({ deltaMS: 16 }) })

    expect(onComplete).toHaveBeenCalledTimes(1)
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      '[LaunchSequenceCanvas] scene.update failed, ending sequence',
      expect.any(Error)
    )
    consoleErrorSpy.mockRestore()
  })

  it('a throwing frame does not double-fire onComplete alongside the watchdog', async () => {
    const onComplete = vi.fn()
    mockSceneUpdate.mockImplementation(() => { throw new Error('boom mid-frame') })
    vi.spyOn(console, 'error').mockImplementation(() => {})

    await act(async () => {
      root = createRoot(container)
      root.render(
        <LaunchSequenceCanvas rocketName="Explorer" targetName="433 Eros" onComplete={onComplete} />
      )
      await vi.advanceTimersByTimeAsync(0)
    })

    act(() => { capturedTickerCallback?.({ deltaMS: 16 }) })

    await act(async () => {
      await vi.advanceTimersByTimeAsync(18_000)
    })

    expect(onComplete).toHaveBeenCalledTimes(1)
  })

  it('healthy frames never call onComplete on their own — only the scene or the watchdog does', async () => {
    const onComplete = vi.fn()

    await act(async () => {
      root = createRoot(container)
      root.render(
        <LaunchSequenceCanvas rocketName="Explorer" targetName="433 Eros" onComplete={onComplete} />
      )
      await vi.advanceTimersByTimeAsync(0)
    })

    for (let i = 0; i < 60; i++) {
      act(() => { capturedTickerCallback?.({ deltaMS: 16 }) })
    }

    expect(mockSceneUpdate).toHaveBeenCalledTimes(60)
    expect(onComplete).not.toHaveBeenCalled()
  })
})
