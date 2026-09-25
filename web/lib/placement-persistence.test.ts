// @vitest-environment jsdom
//
// SSL-341: a structure placed on Earth Base must survive a reload. The chain
// under test is BuildPlaceScreen -> placeStructure -> applyPlaceStructure,
// then the two stores the game reloads from: this device's localStorage save
// (game-context.tsx) and the PocketBase game_states.state row (useAuthSync's
// saveRemoteState), merged back in by mergeRemoteState. Field structures
// built in Takeon persist separately; see lib/takeon/LandnamSync.test.ts.
import { beforeEach, describe, expect, it } from 'vitest'
import { STRUCTURES } from '@/lib/data'
import { DEFAULT_STATE, loadState, mergeRemoteState, normalizeAndRepair, type PartialSave } from '@/lib/game-state'
import { accountGameStateStorageKey } from '@/lib/game-state-storage'
import type { GameState } from '@/lib/game-types'
import { applyPlaceStructure } from '@/lib/systems/EconomySystem'

const STORAGE_KEY = 'landnam-game-state-v1'
const USER_ID = 'player-1'

function freeOpsState(): GameState {
  return normalizeAndRepair({
    screen: 'build',
    tutorial: false,
    player: {
      ...DEFAULT_STATE.player,
      francs: 50_000_000_000,
      missionsDone: 3,
      freeOperations: true,
      placed: ['launchpad'],
      placementPlots: { launchpad: 0 },
      stash: { aluminium: 100, copper: 100, silicon: 100 },
    },
  })
}

function placeSilo(state: GameState, plot = 2): GameState {
  const silo = STRUCTURES.find(structure => structure.id === 'surface-silo')!
  return applyPlaceStructure(state, silo, silo.kind, plot)
}

/** What game-context.tsx writes after every state change. */
function persistLocally(state: GameState, updatedAt = Date.now()) {
  localStorage.setItem(accountGameStateStorageKey(STORAGE_KEY, USER_ID), JSON.stringify({ ...state, updatedAt }))
}

/** What saveRemoteState sends as game_states.state and PocketBase returns on load. */
function remoteRow(state: GameState, updatedAt?: number): PartialSave {
  return { ...(JSON.parse(JSON.stringify(state)) as PartialSave), updatedAt }
}

describe('placed structure persistence across reloads (SSL-341)', () => {
  beforeEach(() => localStorage.clear())

  it('pays for the structure and records its plot', () => {
    const before = freeOpsState()
    const placed = placeSilo(before)
    expect(placed.player.placed).toContain('surface-silo')
    expect(placed.player.placementPlots['surface-silo']).toBe(2)
    expect(placed.player.francs).toBeLessThan(before.player.francs)
  })

  it('survives a reload from this device\'s localStorage save', () => {
    persistLocally(placeSilo(freeOpsState()))

    const reloaded = loadState(accountGameStateStorageKey(STORAGE_KEY, USER_ID))

    expect(reloaded.player.placed).toEqual(expect.arrayContaining(['launchpad', 'surface-silo']))
    expect(reloaded.player.placementPlots['surface-silo']).toBe(2)
  })

  it('survives a reload on a new device from the game_states row', () => {
    const row = remoteRow(placeSilo(freeOpsState()))

    const reloaded = mergeRemoteState(normalizeAndRepair(DEFAULT_STATE), row)

    expect(reloaded.player.placed).toContain('surface-silo')
    expect(reloaded.player.placementPlots['surface-silo']).toBe(2)
  })

  it('survives a reload that happens before the remote save lands', () => {
    // Same mission count on both sides; the game_states row predates the
    // placement, so only the local save has the silo.
    const before = freeOpsState()
    const local = placeSilo(before)
    persistLocally(local, 2_000)

    const reloaded = mergeRemoteState(
      loadState(accountGameStateStorageKey(STORAGE_KEY, USER_ID)),
      remoteRow(before, 1_000),
    )

    expect(reloaded.player.placed).toContain('surface-silo')
    expect(reloaded.player.placementPlots['surface-silo']).toBe(2)
  })

  it('keeps a newer remote placement when this device is behind on the same mission count', () => {
    const before = freeOpsState()
    persistLocally(before, 1_000)

    const reloaded = mergeRemoteState(
      loadState(accountGameStateStorageKey(STORAGE_KEY, USER_ID)),
      remoteRow(placeSilo(before, 3), 2_000),
    )

    expect(reloaded.player.placed).toContain('surface-silo')
    expect(reloaded.player.placementPlots['surface-silo']).toBe(3)
  })

  it('keeps a local placement when this device is ahead of the game_states row', () => {
    const remoteBehind = { ...freeOpsState(), player: { ...freeOpsState().player, missionsDone: 3 } }
    const local = placeSilo({ ...freeOpsState(), player: { ...freeOpsState().player, missionsDone: 4 } })

    const reloaded = mergeRemoteState(local, remoteRow(remoteBehind))

    expect(reloaded.player.placed).toContain('surface-silo')
    expect(reloaded.player.placementPlots['surface-silo']).toBe(2)
  })
})
