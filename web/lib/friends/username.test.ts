import { describe, expect, it } from 'vitest'
import { generateDefaultUsername, isValidUsername } from './username'

describe('generateDefaultUsername', () => {
  it('is deterministic for the same email', () => {
    expect(generateDefaultUsername('player@example.com')).toBe(generateDefaultUsername('player@example.com'))
  })

  it('is case- and whitespace-insensitive', () => {
    expect(generateDefaultUsername('Player@Example.com')).toBe(generateDefaultUsername(' player@example.com '))
  })

  it('produces a valid username', () => {
    expect(isValidUsername(generateDefaultUsername('player@example.com'))).toBe(true)
  })

  it('varies across different emails', () => {
    expect(generateDefaultUsername('a@example.com')).not.toBe(generateDefaultUsername('b@example.com'))
  })
})

describe('isValidUsername', () => {
  it('accepts letters, numbers, underscores within length bounds', () => {
    expect(isValidUsername('IRON_DRIFTER_042')).toBe(true)
  })

  it('rejects too short or too long names', () => {
    expect(isValidUsername('ab')).toBe(false)
    expect(isValidUsername('a'.repeat(25))).toBe(false)
  })

  it('rejects disallowed characters', () => {
    expect(isValidUsername('bad name!')).toBe(false)
  })
})
