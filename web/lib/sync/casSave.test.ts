import { describe, expect, it } from 'vitest'
import { DEFAULT_STATE, normalizeAndRepair } from '@/lib/game-state'
import type { GameState } from '@/lib/game-types'
import { casUpdateGameState, sameContent } from './casSave'
import { stampLedger } from './ledger'

function seed(): GameState {
  const s = normalizeAndRepair(DEFAULT_STATE)
  return stampLedger({ ...s, player: { ...s.player, francs: 1000, missionsDone: 3, placed: ['launchpad'] } }, 'seed')
}

describe('transactional game state save', () => {
  it('retries against the new state when another device wins the comparison', async () => {
    const base = seed()
    const a = stampLedger({ ...base, player: { ...base.player, francs: 1500 } }, 'A')
    const b = stampLedger({ ...base, player: { ...base.player, francs: 800 } }, 'B')
    let server = base
    let attempts = 0
    const result = await casUpdateGameState({ getOne: async id => ({ id, state: server }) }, 'r', 'u', a, async write => {
      attempts++
      if (attempts === 1) { server = b; throw { status: 409 } }
      expect(write.expected).toEqual(b)
      server = write.state
    })
    expect(attempts).toBe(2)
    expect(result.player.francs).toBe(1300)
    expect(server.player.francs).toBe(1300)
  })

  it('retains a failed write for retry after repeated conflicts', async () => {
    await expect(casUpdateGameState({ getOne: async id => ({ id, state: seed() }) }, 'r', 'u', seed(), async () => { throw { status: 409 } })).rejects.toThrow('retry required')
  })

  it('does not hide transport errors', async () => {
    await expect(casUpdateGameState({ getOne: async id => ({ id, state: seed() }) }, 'r', 'u', seed(), async () => { throw new Error('offline') })).rejects.toThrow('offline')
  })

  it('compares content independently of ledger version and timestamp', () => {
    const a = { player: { francs: 1 }, updatedAt: 1, syncLedger: { v: 1, base: {}, devices: {}, version: 3 } } as unknown as GameState
    const b = { ...a, updatedAt: 9, syncLedger: { ...a.syncLedger!, version: 7 } }
    expect(sameContent(a, b)).toBe(true)
  })
})
