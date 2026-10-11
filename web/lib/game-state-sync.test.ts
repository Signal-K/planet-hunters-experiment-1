import { describe, expect, it } from 'vitest'
import { DEFAULT_STATE, type PartialSave } from './game-state'
import {
  isSignInPlaceholder,
  localAccountSlotIsRealSave,
  mayOverwriteSavedRecord,
  resolveGameStateLoad,
} from './game-state-sync'

describe('resolveGameStateLoad', () => {
  it('loads an existing server record instead of merging in the sign-in default', () => {
    const saved: PartialSave = {
      screen: 'hub',
      player: { missionsDone: 2, placed: ['launchpad', 'refinery'], francs: 900 },
    }

    const result = resolveGameStateLoad(DEFAULT_STATE, saved, false)

    expect(result.shouldCreateRemote).toBe(false)
    expect(result.shouldWriteRemote).toBe(false)
    expect(result.state.screen).toBe('hub')
    expect(result.state.player.placed).toEqual(['launchpad', 'refinery'])
    expect(result.state.player.missionsDone).toBe(2)
  })

  it('only requests a default write after the server confirms no record exists', () => {
    const existing = resolveGameStateLoad(DEFAULT_STATE, { screen: 'hub', player: { placed: ['launchpad'] } }, false)
    const missing = resolveGameStateLoad(DEFAULT_STATE, null, false)

    expect(existing.shouldCreateRemote).toBe(false)
    expect(existing.shouldWriteRemote).toBe(false)
    expect(missing.shouldCreateRemote).toBe(true)
    expect(missing.shouldWriteRemote).toBe(true)
    expect(mayOverwriteSavedRecord(DEFAULT_STATE, null)).toBe(true)
  })

  it('simulates a fresh-browser sign-in against a non-empty server record', () => {
    // React renders the sign-in placeholder, then the local persist effect
    // writes it into the new account slot before the fetch returns. A native
    // client may already own the server row, including fields the placeholder
    // does not have.
    const autoWrittenSlot = JSON.stringify({ ...DEFAULT_STATE, updatedAt: Date.now() })
    const hasAccountLocalState = localAccountSlotIsRealSave(autoWrittenSlot)
    const nativeSave: PartialSave = {
      screen: 'hub',
      player: {
        missionsDone: 3,
        placed: ['launchpad', 'refinery'],
        francs: 1800,
        freeOperations: true,
        laserCapacitorLevel: 2,
        completedMissions: [],
      },
    }

    expect(hasAccountLocalState).toBe(false)
    expect(localAccountSlotIsRealSave(null)).toBe(false)
    expect(isSignInPlaceholder(DEFAULT_STATE)).toBe(true)

    const decision = resolveGameStateLoad(DEFAULT_STATE, nativeSave, hasAccountLocalState)

    expect(decision.shouldCreateRemote).toBe(false)
    expect(decision.shouldWriteRemote).toBe(false)
    expect(decision.state.screen).toBe('hub')
    expect(decision.state.player.placed).toEqual(['launchpad', 'refinery'])
    expect(decision.state.player.missionsDone).toBe(3)
    expect(decision.state.player.laserCapacitorLevel).toBe(2)
    expect(isSignInPlaceholder(decision.state)).toBe(false)
    expect(mayOverwriteSavedRecord(DEFAULT_STATE, nativeSave)).toBe(false)
    expect(mayOverwriteSavedRecord(decision.state, nativeSave)).toBe(true)
  })

  it('still merges a real local save and refuses to write the placeholder over it', () => {
    const localSave = {
      ...DEFAULT_STATE,
      screen: 'hub' as const,
      player: { ...DEFAULT_STATE.player, placed: ['launchpad'], missionsDone: 1, francs: 500 },
    }
    const remote: PartialSave = {
      screen: 'mining',
      player: { placed: ['launchpad', 'refinery'], missionsDone: 2, francs: 700 },
    }

    expect(localAccountSlotIsRealSave(JSON.stringify(localSave))).toBe(true)

    const decision = resolveGameStateLoad(localSave, remote, true)

    expect(decision.shouldCreateRemote).toBe(false)
    expect(decision.shouldWriteRemote).toBe(true)
    expect(decision.state.player.placed).toEqual(expect.arrayContaining(['launchpad', 'refinery']))
    expect(decision.state.player.missionsDone).toBe(2)
    expect(mayOverwriteSavedRecord(DEFAULT_STATE, remote)).toBe(false)
  })
})
