// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { scheduleLandnamPush } from './push'

type PushWindow = { PushManager?: unknown }

describe('scheduleLandnamPush', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
    delete (window as unknown as PushWindow).PushManager
  })

  it('returns without reading the registration when PushManager is missing', async () => {
    // iOS Safari outside an installed home-screen app exposes serviceWorker
    // but no PushManager, so registration.pushManager would be undefined.
    const readyAccessed = vi.fn()
    vi.stubGlobal('navigator', {
      serviceWorker: {
        get ready() {
          readyAccessed()
          return Promise.reject(new Error('registration must not be read'))
        },
      },
    })
    delete (window as unknown as PushWindow).PushManager

    await expect(
      scheduleLandnamPush({ title: 'ARRIVED', body: 'Rocket arrived.' }),
    ).resolves.toBeUndefined()
    expect(readyAccessed).not.toHaveBeenCalled()
  })

  it('checks the subscription and sends nothing when PushManager is present but unsubscribed', async () => {
    const getSubscription = vi.fn().mockResolvedValue(null)
    vi.stubGlobal('navigator', {
      serviceWorker: { ready: Promise.resolve({ pushManager: { getSubscription } }) },
    })
    ;(window as unknown as PushWindow).PushManager = function PushManager() {}
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response())

    await expect(
      scheduleLandnamPush({ title: 'ARRIVED', body: 'Rocket arrived.' }),
    ).resolves.toBeUndefined()
    expect(getSubscription).toHaveBeenCalled()
    expect(fetchSpy).not.toHaveBeenCalled()
  })
})
