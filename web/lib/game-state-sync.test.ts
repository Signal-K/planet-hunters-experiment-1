import { describe, expect, it } from 'vitest'
import { DEFAULT_STATE, type PartialSave } from './game-state'
import { resolveGameStateLoad } from './game-state-sync'

describe('resolveGameStateLoad', () => {
  it('loads an existing server record instead of merging in the sign-in default', () => {
    const saved: PartialSave = {
      screen: 'hub',
      player: { missionsDone: 2, placed: ['launchpad', 'refinery'], francs: 900 },
    }

    const result = resolveGameStateLoad(DEFAULT_STATE, saved, false)

    expect(result.shouldCreateRemote).toBe(false)
    expect(result.state.screen).toBe('hub')
    expect(result.state.player.placed).toEqual(['launchpad', 'refinery'])
    expect(result.state.player.missionsDone).toBe(2)
  })

  it('only requests a default write after the server confirms no record exists', () => {
    const existing = resolveGameStateLoad(DEFAULT_STATE, { screen: 'hub', player: { placed: ['launchpad'] } }, false)
    const missing = resolveGameStateLoad(DEFAULT_STATE, null, false)

    expect(existing.shouldCreateRemote).toBe(false)
    expect(missing.shouldCreateRemote).toBe(true)
  })
})
