import { describe, expect, it } from 'vitest'
import { isStagingPlaytestAccount, stagingSignupFields } from './staging-account'

describe('staging playtest accounts', () => {
  it('recognises the reserved @landnam.test domain', () => {
    expect(isStagingPlaytestAccount('cycle-bot@landnam.test')).toBe(true)
    expect(isStagingPlaytestAccount('player@example.com')).toBe(false)
    expect(isStagingPlaytestAccount(null)).toBe(false)
  })

  it('marks staging playtest signups verified without an email challenge', () => {
    const fields = stagingSignupFields('qa@landnam.test')
    expect(fields.verified).toBe(true)
    expect(stagingSignupFields('real@example.com')).toEqual({})
  })
})
