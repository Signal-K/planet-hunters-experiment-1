import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const init = vi.fn()
const capture = vi.fn()
const identify = vi.fn()

vi.mock('posthog-js', () => ({
  default: {
    init: (...args: unknown[]) => init(...args),
    capture: (...args: unknown[]) => capture(...args),
    identify: (...args: unknown[]) => identify(...args),
  },
}))

describe('PostHog idle init', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
    init.mockReset()
    capture.mockReset()
    identify.mockReset()
    vi.stubEnv('NEXT_PUBLIC_POSTHOG_KEY', 'phc_test')
    vi.stubGlobal('window', {
      location: { origin: 'http://localhost' },
      setTimeout: (cb: () => void) => { cb(); return 0 },
    })
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
  })

  it('loads on idle with heatmaps and dead clicks off, and replay sampled at 5%', async () => {
    let idle: (() => void) | undefined
    vi.stubGlobal('window', {
      location: { origin: 'http://localhost' },
      requestIdleCallback: (cb: () => void) => { idle = cb; return 1 },
      setTimeout: (cb: () => void) => { cb(); return 0 },
    })
    const { captureGameEvent, initPostHog } = await import('./posthog')
    captureGameEvent('free_ops_unlocked', { missions_done: 1 })
    expect(init).not.toHaveBeenCalled()
    initPostHog()
    expect(init).not.toHaveBeenCalled()
    idle?.()
    expect(init).toHaveBeenCalledOnce()
    expect(init.mock.calls[0][1]).toMatchObject({
      capture_heatmaps: false,
      capture_dead_clicks: false,
      session_recording: { maskAllInputs: true, sampleRate: 0.05 },
    })
    expect(capture).toHaveBeenCalledWith('free_ops_unlocked', { missions_done: 1 })
  })

  it('falls back to setTimeout when requestIdleCallback is missing', async () => {
    const { initPostHog } = await import('./posthog')
    initPostHog()
    expect(init).toHaveBeenCalledOnce()
  })
})
