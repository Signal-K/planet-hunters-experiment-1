import { describe, it, expect, afterEach, vi } from 'vitest'

// The module reads NEXT_PUBLIC_* at import time (Next.js inlines them at
// build time), so each case needs a fresh module registry.
async function loadWith(env: Record<string, string | undefined>, origin: string | null) {
  vi.resetModules()
  for (const [key, value] of Object.entries(env)) {
    if (value === undefined) vi.stubEnv(key, '')
    else vi.stubEnv(key, value)
  }
  if (origin === null) {
    delete (globalThis as { window?: unknown }).window
  } else {
    ;(globalThis as { window?: unknown }).window = { location: { origin } }
  }
  return import('@/lib/pb-config')
}

afterEach(() => {
  vi.unstubAllEnvs()
  delete (globalThis as { window?: unknown }).window
})

describe('pb-config', () => {
  it('falls back to the local dev backends when unset', async () => {
    const mod = await loadWith({ NEXT_PUBLIC_SHARED_PB_URL: undefined, NEXT_PUBLIC_LANDNAM_PB_URL: undefined }, null)
    expect(mod.SHARED_PB_URL).toBe('http://localhost:8090')
    expect(mod.LANDNAM_PB_URL).toBe('http://localhost:8093')
  })

  it('does not flag loopback backends during local development', async () => {
    const mod = await loadWith({ NEXT_PUBLIC_SHARED_PB_URL: undefined, NEXT_PUBLIC_LANDNAM_PB_URL: undefined }, 'http://localhost:3000')
    expect(mod.sharedBackendMisconfigured()).toBe(false)
    expect(mod.landnamBackendMisconfigured()).toBe(false)
  })

  it('flags a deployed build still pointing at localhost', async () => {
    const mod = await loadWith({ NEXT_PUBLIC_SHARED_PB_URL: undefined, NEXT_PUBLIC_LANDNAM_PB_URL: undefined }, 'https://signal-k.vercel.app')
    expect(mod.sharedBackendMisconfigured()).toBe(true)
    expect(mod.landnamBackendMisconfigured()).toBe(true)
  })

  it('accepts a real configured backend on a deployed origin', async () => {
    const mod = await loadWith({
      NEXT_PUBLIC_SHARED_PB_URL: 'https://signal-k-starsailors.fly.dev',
      NEXT_PUBLIC_LANDNAM_PB_URL: 'https://signal-k-landnam.fly.dev',
    }, 'https://signal-k.vercel.app')
    expect(mod.SHARED_PB_URL).toBe('https://signal-k-starsailors.fly.dev')
    expect(mod.sharedBackendMisconfigured()).toBe(false)
    expect(mod.landnamBackendMisconfigured()).toBe(false)
  })

  it('never flags anything during SSR, where there is no origin to compare', async () => {
    const mod = await loadWith({ NEXT_PUBLIC_SHARED_PB_URL: undefined, NEXT_PUBLIC_LANDNAM_PB_URL: undefined }, null)
    expect(mod.sharedBackendMisconfigured()).toBe(false)
  })
})
