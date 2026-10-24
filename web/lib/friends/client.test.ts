import { describe, expect, it } from 'vitest'
import { MIN_CALLSIGN_SEARCH_LENGTH, isSearchableCallsign } from './client'

describe('friend callsign search (SSL-312)', () => {
  it('does not export a full-account directory lister', async () => {
    const mod = await import('./client')
    expect('listFriendDirectory' in mod).toBe(false)
  })

  it('requires a minimum-length callsign before searching', () => {
    expect(isSearchableCallsign('')).toBe(false)
    expect(isSearchableCallsign('  ab ')).toBe(false)
    expect(isSearchableCallsign('a'.repeat(MIN_CALLSIGN_SEARCH_LENGTH))).toBe(true)
  })
})
