import { describe, expect, it, vi } from 'vitest'
import { LandnamSync, type LandnamPersistenceClient } from './LandnamSync'
import { getOutbox } from '@/lib/offline/pbOutbox'
import type { MissionState, SyncAdapter } from '@takeon/engine'

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
