import { describe, expect, it } from 'vitest'
import { accountGameStateStorageKey, gameStateStorageKey } from './game-state-storage'

describe('account-scoped game state storage', () => {
  it('keeps authenticated saves isolated by user id', () => {
    const base = 'landnam-game-state-v1'
    expect(accountGameStateStorageKey(base, 'crew-alpha')).toBe(`${base}:user:crew-alpha`)
    expect(gameStateStorageKey(base, 'crew-alpha')).not.toBe(gameStateStorageKey(base, 'crew-beta'))
  })

  it('preserves the unscoped slot for guest and legacy hydration', () => {
    expect(gameStateStorageKey('landnam-game-state-v1', null)).toBe('landnam-game-state-v1')
    expect(gameStateStorageKey('landnam-game-state-v1')).toBe('landnam-game-state-v1')
  })
})
