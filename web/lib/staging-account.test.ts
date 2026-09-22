import { describe, expect, it } from 'vitest'
import { isStagingPlaytestAccount, stagingSignupFields } from './staging-account'

describe('staging playtest accounts', () => {
  it('recognises the reserved @landnam.test domain', () => {
    expect(isStagingPlaytestAccount('cycle-bot@landnam.test')).toBe(true)
    expect(isStagingPlaytestAccount('player@example.com')).toBe(false)
    expect(isStagingPlaytestAccount(null)).toBe(false)
  })

  it('does not instruct public signup to send verified (PocketBase rejects that)', () => {
    // Helper still describes the Clerk-like intent for tests/docs, but the
    // game create path must not spread these fields onto the shared users API.
    expect(stagingSignupFields('qa@landnam.test').verified).toBe(true)
    expect(stagingSignupFields('real@example.com')).toEqual({})
  })
})
