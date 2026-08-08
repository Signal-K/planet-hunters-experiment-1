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

vi.mock('pixi.js', () => ({
  Application: class {
    init = vi.fn().mockResolvedValue(undefined)
    ticker = { add: vi.fn() }
    destroy = vi.fn()
  },
}))

vi.mock('@/lib/pixi/launchScene', () => ({
  LAUNCH_W: 400,
  LAUNCH_H: 300,
  buildLaunchScene: vi.fn((_app: unknown, opts: { onComplete: () => void }) => {
    capturedSceneOnComplete = opts.onComplete
    return { update: vi.fn() }
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
      await vi.advanceTimersByTimeAsync(12_000)
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
      await vi.advanceTimersByTimeAsync(12_000)
    })

    expect(onComplete).toHaveBeenCalledTimes(1)
  })
})
