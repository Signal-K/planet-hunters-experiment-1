import { describe, expect, it } from 'vitest'
import { screenForPath } from './offlineNav'

describe('screen navigation without the network (SSL-729)', () => {
  it('reads the game screen from a path, and only real screens', () => {
    expect(screenForPath('/game/hub')).toBe('hub')
    expect(screenForPath('/game/market?x=1')).toBe('market')
    expect(screenForPath('/game/not-a-screen')).toBeNull()
    expect(screenForPath('/game')).toBeNull()
  })
})
