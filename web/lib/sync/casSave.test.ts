import { describe, expect, it } from 'vitest'
import { DEFAULT_STATE, normalizeAndRepair } from '@/lib/game-state'
import type { GameState } from '@/lib/game-types'
import { casUpdateGameState } from './casSave'
import { stampLedger } from './ledger'

function seed(): GameState {
  const s = normalizeAndRepair(DEFAULT_STATE)
  return stampLedger({ ...s, player: { ...s.player, francs: 1000, missionsDone: 3, placed: ['launchpad'] } }, 'seed')
}

describe('optimistic game_states write', () => {
  it('merges the server copy and retries when another device writes in between', async () => {
    const base = seed()
    const a = stampLedger({ ...base, player: { ...base.player, francs: 1500 } }, 'A')
    const b = stampLedger({ ...base, player: { ...base.player, francs: 800 } }, 'B')
    let server: unknown = base
    let raced = false
    const client = {
      async getOne(id: string) { return { id, state: server } },
      async update(_id: string, data: Record<string, unknown>) {
        server = data.state
        // Device B lands its own merged write right after A's first write.
        if (!raced) { raced = true; server = await casUpdateGameState({ getOne: async id => ({ id, state: server }), update: async (_i, d) => { server = d.state } }, 'r', 'u', b) }
      },
    }
    const result = await casUpdateGameState(client, 'r', 'u', a)
    expect(result.player.francs).toBe(1300)
    expect((server as GameState).player.francs).toBe(1300)
  })

  it('does not accept a different write with the same version', async () => {
    const base = seed()
    const a = stampLedger({ ...base, player: { ...base.player, francs: 1500 } }, 'A')
    const b = stampLedger({ ...base, player: { ...base.player, francs: 800 } }, 'B')
    let server: GameState = base
    let raced = false
    const result = await casUpdateGameState({
      async getOne(id) { return { id, state: server } },
      async update(_id, data) {
        server = data.state as GameState
        if (!raced) {
          raced = true
          server = { ...b, syncLedger: { ...b.syncLedger!, version: server.syncLedger!.version } }
        }
      },
    }, 'r', 'u', a)
    expect(result.player.francs).toBe(1300)
    expect(server.player.francs).toBe(1300)
  })

  it('rejects after repeated conflicts so the caller can retry', async () => {
    const base = seed()
    let server: GameState = base
    await expect(casUpdateGameState({
      async getOne(id) { return { id, state: server } },
      async update(_id, data) {
        const written = data.state as GameState
        server = { ...written, player: { ...written.player, francs: written.player.francs + 1 } }
      },
    }, 'r', 'u', base)).rejects.toThrow('retry required')
  })
})

describe('sameContent', () => {
  it('ignores the ledger version and updatedAt so a no-op merge cannot loop writes', async () => {
    const { sameContent } = await import('./casSave')
    const a = { player: { francs: 1 }, updatedAt: 1, syncLedger: { v: 1, base: {}, devices: {}, version: 3 } } as any
    const b = { ...a, updatedAt: 9, syncLedger: { ...a.syncLedger, version: 7 } }
    expect(sameContent(a, b)).toBe(true)
    expect(sameContent(a, { ...b, player: { francs: 2 } })).toBe(false)
  })
})
