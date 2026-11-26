import { describe, expect, it } from 'vitest'
import { DEFAULT_STATE, normalizeAndRepair } from '@/lib/game-state'
import { isSignInPlaceholder } from '@/lib/game-state-sync'
import { STARTER_BASE_PLACED } from './starter-base'

describe('starter base', () => {
  it('a new game stands on the silo and the other surface buildings', () => {
    expect(DEFAULT_STATE.player.placed).toEqual([...STARTER_BASE_PLACED])
    expect(DEFAULT_STATE.player.placed).toContain('surface-silo')
  })
  it('an untouched new game is still a sign-in placeholder, so it never overwrites a real save', () => {
    expect(isSignInPlaceholder(DEFAULT_STATE)).toBe(true)
  })
  it('an existing save keeps exactly what it built', () => {
    const saved = normalizeAndRepair({ ...DEFAULT_STATE, player: { ...DEFAULT_STATE.player, placed: ['launchpad'], placementPlots: { launchpad: 0 }, missionsDone: 1 } })
    expect(saved.player.placed).toEqual(['launchpad'])
  })
})
