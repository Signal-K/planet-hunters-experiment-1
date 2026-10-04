import { describe, expect, it } from 'vitest'
import {
  AuthTimeoutError,
  WARMING_GAVE_UP,
  isTransientAuthFailure,
  retryTransient,
  signInGateMessage,
  waitForBackendHealth,
} from './auth-resilience'

describe('signInGateMessage', () => {
  it('keeps a real password rejection', () => {
    const err = { status: 400, message: 'Failed to authenticate.' }
    expect(signInGateMessage('Failed to authenticate.', err)).toBe('Sign in failed. Check your email and password.')
  })

  it('does not blame the password when the server is cold', () => {
    expect(signInGateMessage('Failed to authenticate.', { status: 503 })).toBe(WARMING_GAVE_UP)
    expect(signInGateMessage('Something went wrong.', { status: 0 })).toBe(WARMING_GAVE_UP)
    expect(isTransientAuthFailure(new Error('landnam-auth exchange failed: 503'))).toBe(true)
  })
})

describe('waitForBackendHealth', () => {
  it('returns as soon as a check succeeds', async () => {
    let calls = 0
    await waitForBackendHealth(async () => {
      calls += 1
      if (calls < 3) throw Object.assign(new Error('cold'), { status: 503 })
    }, {
      timeoutMs: 10_000,
      sleep: async () => {},
      now: () => 0,
    })
    expect(calls).toBe(3)
  })

  it('stops with a warming error instead of hanging', async () => {
    let clock = 0
    await expect(waitForBackendHealth(async () => {
      throw Object.assign(new Error('cold'), { status: 503 })
    }, {
      timeoutMs: 1_000,
      sleep: async ms => { clock += ms },
      now: () => clock,
    })).rejects.toBeInstanceOf(AuthTimeoutError)
  })
})

describe('retryTransient', () => {
  it('retries a 503 and then returns', async () => {
    let calls = 0
    const value = await retryTransient(async () => {
      calls += 1
      if (calls === 1) throw Object.assign(new Error('cold'), { status: 503 })
      return 'ok'
    }, { sleep: async () => {}, timeoutMs: 50 })
    expect(value).toBe('ok')
    expect(calls).toBe(2)
  })

  it('does not retry a rejected password', async () => {
    let calls = 0
    await expect(retryTransient(async () => {
      calls += 1
      throw Object.assign(new Error('Failed to authenticate.'), { status: 400 })
    }, { sleep: async () => {}, timeoutMs: 50 })).rejects.toMatchObject({ status: 400 })
    expect(calls).toBe(1)
  })
})
