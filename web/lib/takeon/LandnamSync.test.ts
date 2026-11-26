import { describe, expect, it, vi } from 'vitest'
import { LandnamSync, type LandnamPersistenceClient } from './LandnamSync'
import { getOutbox } from '@/lib/offline/pbOutbox'

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
})
