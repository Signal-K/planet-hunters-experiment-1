import { describe, expect, it } from 'vitest'
import { DEFAULT_STATE, mergeRemoteState, normalizeAndRepair } from '@/lib/game-state'
import type { GameState } from '@/lib/game-types'
import { ledgerValues, mergeLedgers, stampLedger } from './ledger'

// Two devices start from the same synced save, play offline at the same time, then sync in either order.
function shared(): GameState {
  const s = normalizeAndRepair(DEFAULT_STATE)
  return stampLedger({ ...s, player: { ...s.player, francs: 1000, missionsDone: 3, stash: { nickel: 2 }, placed: ['launchpad'] }, updatedAt: 1 }, 'seed')
}
function play(s: GameState, device: string, edit: (p: GameState['player']) => GameState['player'], at: number): GameState {
  return stampLedger({ ...s, player: edit(s.player), updatedAt: at }, device)
}
const deviceA = (s: GameState) => play(s, 'A', p => ({ ...p, francs: p.francs + 500, missionsDone: p.missionsDone + 1, stash: { ...p.stash, nickel: (p.stash?.nickel ?? 0) + 3 }, placed: [...p.placed, 'surface-silo'] }), 10)
const deviceB = (s: GameState) => play(s, 'B', p => ({ ...p, francs: p.francs - 200, missionsDone: p.missionsDone + 1, stash: { ...p.stash, nickel: (p.stash?.nickel ?? 0) + 2, cobalt: 1 }, placed: [...p.placed, 'astronaut-academy'] }), 20)

function expectConverged(s: GameState) {
  expect(s.player.francs).toBe(1300)
  expect(s.player.missionsDone).toBe(5)
  expect(s.player.stash).toMatchObject({ nickel: 7, cobalt: 1 })
  expect(new Set(s.player.placed)).toEqual(new Set(['launchpad', 'surface-silo', 'astronaut-academy']))
}

describe('conflict-free progress ledger', () => {
  it('counts both offline devices whichever syncs first, with no double counting', () => {
    const base = shared()
    const a = deviceA(base), b = deviceB(base)
    // A uploads first; B fetches the server copy and merges, then A pulls B's merged upload.
    const serverAfterB = mergeRemoteState(b, a)
    expectConverged(serverAfterB)
    expectConverged(mergeRemoteState(a, serverAfterB))
    // Opposite order.
    const serverAfterA = mergeRemoteState(a, b)
    expectConverged(serverAfterA)
    expectConverged(mergeRemoteState(b, serverAfterA))
    // Re-merging the same data again (replays, repeated pulls) changes nothing.
    expectConverged(mergeRemoteState(serverAfterA, serverAfterB))
    expectConverged(mergeRemoteState(mergeRemoteState(serverAfterA, serverAfterA), serverAfterB))
  })

  it('keeps counting after further local play on a merged save', () => {
    const merged = mergeRemoteState(deviceA(shared()), deviceB(shared()))
    const more = play(merged, 'A', p => ({ ...p, francs: p.francs + 1 }), 30)
    expect(more.player.francs).toBe(1301)
    expect(mergeRemoteState(merged, more).player.francs).toBe(1301)
  })

  it('never lets an empty or older save overwrite a richer one', () => {
    const rich = deviceA(shared())
    const empty = stampLedger(normalizeAndRepair(DEFAULT_STATE), 'fresh')
    expect(mergeRemoteState(empty, rich).player.francs).toBe(1500)
    expect(mergeRemoteState(rich, empty).player.francs).toBe(1500)
    const stale = shared()
    expect(mergeRemoteState(stale, rich).player.francs).toBe(1500)
    expect(mergeRemoteState(rich, stale).player.stash?.nickel).toBe(5)
  })

  it('stamping is idempotent and merged ledgers agree with the save', () => {
    const a = deviceA(shared())
    expect(stampLedger(a, 'A')).toBe(a)
    const l = mergeLedgers(a.syncLedger, deviceB(shared()).syncLedger)!
    expect(ledgerValues(l).francs).toBe(1300)
  })
})
