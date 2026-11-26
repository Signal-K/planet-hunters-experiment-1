import { describe, expect, it, vi } from 'vitest'
import { LandnamSync, type LandnamPersistenceClient } from './LandnamSync'
import { getOutbox } from '@/lib/offline/pbOutbox'
import type { MissionState, SyncAdapter } from '@takeon/engine'
import { writeSolarFieldIdentity } from './solarFieldIdentity'

describe('field sync', () => {
  it('does not load a stale server field while that field has an offline edit queued', async () => {
    const collection = vi.fn()
    const client = { authStore: { record: { id: 'site-user' } }, collection } as unknown as LandnamPersistenceClient
    const outbox = getOutbox()
    const filter = 'user = "site-user" && target_id = "site-mars"'
    await outbox.enqueue({ type: 'upsert', collection: 'voxel_worlds', id: 'test-id', filter, data: {} })
    try {
      await expect(new LandnamSync({ client }).loadMission('site-mars')).rejects.toThrow('waiting to sync')
      expect(collection).not.toHaveBeenCalled()
    } finally {
      await outbox.discard(op => op.type === 'upsert' && op.filter === filter)
    }
  })

  it('does not restore an unscoped local field when the server cannot be reached', async () => {
    const fallback = { loadMission: vi.fn() } as unknown as SyncAdapter
    const client = {
      authStore: { record: { id: 'site-user' } },
      collection: () => ({ getFirstListItem: vi.fn().mockRejectedValue(new Error('offline')) }),
    } as unknown as LandnamPersistenceClient
    await expect(new LandnamSync({ client, fallback }).loadMission('site-mars')).rejects.toThrow('Could not load')
    expect(fallback.loadMission).not.toHaveBeenCalled()
  })

  it('only treats an actual missing world as a new field', async () => {
    const client = {
      authStore: { record: { id: 'site-user' } },
      collection: () => ({ getFirstListItem: vi.fn().mockRejectedValue({ status: 404 }) }),
    } as unknown as LandnamPersistenceClient
    await expect(new LandnamSync({ client }).loadMission('site-mars')).resolves.toBeNull()
  })

  it('refuses a damaged core snapshot instead of regenerating a field', async () => {
    const client = {
      authStore: { record: { id: 'site-user' } },
      collection: (name: string) => name === 'voxel_worlds'
        ? { getFirstListItem: vi.fn().mockResolvedValue({ rover: {}, snapshot: 'broken' }) }
        : { getFullList: vi.fn().mockResolvedValue([]) },
    } as unknown as LandnamPersistenceClient
    await expect(new LandnamSync({ client }).loadMission('site-mars')).rejects.toThrow('Could not restore')
  })

  it('finishes an older field save before starting the next', async () => {
    let release: () => void = () => {}
    const gate = new Promise<void>(resolve => { release = resolve })
    const update = vi.fn().mockImplementationOnce(async () => gate).mockResolvedValue({})
    const client = {
      authStore: { record: { id: 'serial-user' } },
      collection: (name: string) => name === 'voxel_worlds'
        ? { getFirstListItem: vi.fn().mockResolvedValue({ id: 'world' }), update }
        : { getFullList: vi.fn().mockResolvedValue([]) },
    } as unknown as LandnamPersistenceClient
    const state = { id: 'serial-mars', bodyId: 'mars', seed: 1, time: 1, status: 'active',
      edits: { '1,2,3': 0 }, rover: {}, anomalies: [], photos: [], structures: [] } as unknown as MissionState
    const sync = new LandnamSync({ client })
    const first = sync.saveMission(state, 'Rover')
    const second = sync.saveMission({ ...state, time: 2, edits: { ...state.edits, '2,2,3': 0 } }, 'Rover')
    await vi.waitFor(() => expect(update).toHaveBeenCalledTimes(1))
    release()
    await Promise.all([first, second])
    expect(update.mock.calls.map(call => call[1].time)).toEqual([1, 2])
    expect(update.mock.calls[1][1].edits).toEqual({ '1,2,3': 0, '2,2,3': 0 })
  })

  it('saves and reloads mined voxel edits with the solar field snapshot', async () => {
    let world: Record<string, unknown> | null = null
    const worlds = {
      getFirstListItem: vi.fn(async () => {
        if (!world) throw { status: 404 }
        return world
      }),
      create: vi.fn(async (data: Record<string, unknown>) => { world = { id: 'world', ...data }; return world }),
      update: vi.fn(),
    }
    const structures = { getFullList: vi.fn().mockResolvedValue([]) }
    const client = { authStore: { record: { id: 'restore-user' } },
      collection: (name: string) => name === 'voxel_worlds' ? worlds : structures } as unknown as LandnamPersistenceClient
    const coreSnapshot = writeSolarFieldIdentity(JSON.stringify({ v: 1, bodyId: 'mars', rover: {},
      edits: { '1,2,3': 0 }, config: { body: { coreDEM: { size: 2, heights: [1, 2, 3, 4], surfaceMaterials: [1, 1, 1, 1] } } } }),
    { kind: 'solar', version: 1, bodyId: 'mars', zone: 'east', seed: 42 })
    const state = { id: 'solar-mars-east', bodyId: 'mars', seed: 42, time: 1, status: 'active',
      edits: { '1,2,3': 0 }, coreSnapshot, rover: {}, anomalies: [], photos: [], structures: [] } as unknown as MissionState
    const sync = new LandnamSync({ client })
    await sync.saveMission(state, 'Rover')
    const restored = await sync.loadMission(state.id)
    expect(restored?.edits).toEqual(state.edits)
    expect(restored?.coreSnapshot).toBe(coreSnapshot)
  })

  it('stores failed saves in the outbox and replaces them with the latest save', async () => {
    const filter = 'user = "site-user" && target_id = "site-mars"'
    const create = vi.fn()
    const client = {
      authStore: { record: { id: 'site-user' } },
      collection: () => ({ getFirstListItem: vi.fn().mockRejectedValue(new Error('offline')), create }),
    } as unknown as LandnamPersistenceClient
    const state = { id: 'site-mars', bodyId: 'mars', seed: 1, time: 1, status: 'active',
      edits: {}, rover: {}, anomalies: [], photos: [], structures: [] } as unknown as MissionState
    const outbox = getOutbox()
    try {
      const sync = new LandnamSync({ client })
      await sync.saveMission(state, 'Rover')
      expect(await outbox.has(op => op.type === 'field-save' && op.filter === filter)).toBe(true)
      await sync.saveMission({ ...state, time: 2 }, 'Rover')
      const saves = outbox.pending().filter(item => item.op.type === 'field-save' && item.op.filter === filter)
      expect(saves).toHaveLength(1)
      expect(saves[0].op.type === 'field-save' && saves[0].op.data.time).toBe(2)
      expect(create).not.toHaveBeenCalled()
    } finally {
      await outbox.discard(op => op.type === 'field-save' && op.filter === filter)
    }
  })

})
