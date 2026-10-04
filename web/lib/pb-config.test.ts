import { describe, expect, it } from 'vitest'
import { isLoopbackPbUrl, resolvePocketBaseUrl } from './pb-config'

const deployed = 'https://signal-k-landnam.fly.dev'
const devFallback = 'http://localhost:8093'

describe('resolvePocketBaseUrl', () => {
  it('keeps an explicit deployed URL', () => {
    expect(resolvePocketBaseUrl({
      configured: deployed,
      devFallback,
      deployed,
      landnamEnv: 'staging',
      allowLoopback: false,
    })).toBe(deployed)
  })

  it('replaces a loopback URL on a staging or production build', () => {
    for (const landnamEnv of ['staging', 'production'] as const) {
      expect(resolvePocketBaseUrl({
        configured: 'http://localhost:8091',
        devFallback,
        deployed,
        landnamEnv,
        allowLoopback: false,
      })).toBe(deployed)
      expect(resolvePocketBaseUrl({
        configured: 'http://127.0.0.1:8090',
        devFallback,
        deployed,
        landnamEnv,
        allowLoopback: false,
      })).toBe(deployed)
    }
  })

  it('replaces a missing URL on a deployed build because the dev fallback is loopback', () => {
    expect(resolvePocketBaseUrl({
      configured: undefined,
      devFallback,
      deployed,
      landnamEnv: 'staging',
      allowLoopback: false,
    })).toBe(deployed)
  })

  it('keeps loopback for local builds and when the override is set', () => {
    expect(resolvePocketBaseUrl({
      configured: 'http://localhost:8091',
      devFallback,
      deployed,
      landnamEnv: undefined,
      allowLoopback: false,
    })).toBe('http://localhost:8091')
    expect(resolvePocketBaseUrl({
      configured: undefined,
      devFallback,
      deployed,
      landnamEnv: undefined,
      allowLoopback: false,
    })).toBe(devFallback)
    expect(resolvePocketBaseUrl({
      configured: 'http://localhost:8091',
      devFallback,
      deployed,
      landnamEnv: 'staging',
      allowLoopback: true,
    })).toBe('http://localhost:8091')
  })

  it('recognises loopback hosts only', () => {
    expect(isLoopbackPbUrl('http://localhost:8091')).toBe(true)
    expect(isLoopbackPbUrl('http://127.0.0.1:8090/')).toBe(true)
    expect(isLoopbackPbUrl('https://signal-k-landnam.fly.dev')).toBe(false)
    expect(isLoopbackPbUrl('http://host.docker.internal:8091')).toBe(false)
  })
})
