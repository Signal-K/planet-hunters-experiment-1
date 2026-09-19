import { describe, expect, it } from 'vitest'
import { syncLabel } from '@/components/game/LandnamSyncStatus'
import { backoffMs, createOutbox, MAX_ATTEMPTS, memoryStore, newRecordId, type OutboxFailure, type OutboxOp } from './outbox'
import { classifyHttpStatus } from './pbOutbox'

function harness(results: Array<OutboxFailure | null>) {
  const calls: OutboxOp[] = []
  let clock = 1_000
  const outbox = createOutbox({
    store: memoryStore(),
    execute: async op => { calls.push(op); return results.length ? results.shift()! : null },
    now: () => clock,
    isOnline: () => false,
  })
  return { outbox, calls, advance: (ms: number) => { clock += ms } }
}

const create: OutboxOp = { type: 'create', collection: 'mission_runs', id: 'aaaaaaaaaaaaaaa', data: { status: 'in_progress' } }
const update: OutboxOp = { type: 'update', collection: 'mission_runs', id: 'aaaaaaaaaaaaaaa', data: { status: 'completed' } }

describe('outbox', () => {
  it('keeps only the latest snapshot of a keyed upsert', async () => {
    const h = harness([])
    const upsert = (time: number, filter = 'target_id = "t1"'): OutboxOp => ({ type: 'upsert', collection: 'voxel_worlds', id: 'bbbbbbbbbbbbbbb', filter, data: { time } })
    await h.outbox.enqueue(upsert(1))
    await h.outbox.enqueue(upsert(2))
    await h.outbox.enqueue(upsert(3, 'target_id = "t2"'))
    expect(h.outbox.pending()).toHaveLength(2)
    await h.outbox.flush()
    expect(h.calls.map(c => (c.type === 'upsert' ? c.data.time : null))).toEqual([2, 3])
  })

  it('classifies community HTTP statuses for retry', () => {
    expect(classifyHttpStatus(200)).toBeNull()
    expect(classifyHttpStatus(401)).toEqual({ kind: 'offline' })
    expect(classifyHttpStatus(503)).toEqual({ kind: 'offline' })
    expect(classifyHttpStatus(400)).toMatchObject({ kind: 'rejected' })
  })

  it('replays queued writes in the order they were made', async () => {
    const h = harness([])
    await h.outbox.enqueue(create)
    await h.outbox.enqueue(update)
    await h.outbox.flush()
    expect(h.calls.map(c => c.type)).toEqual(['create', 'update'])
    expect(h.outbox.snapshot()).toMatchObject({ waiting: 0, failed: 0 })
  })

  it('stops at the first offline failure without burning an attempt', async () => {
    const h = harness([{ kind: 'offline' }])
    await h.outbox.enqueue(create)
    await h.outbox.enqueue(update)
    await h.outbox.flush()
    expect(h.calls).toHaveLength(1)
    expect(h.outbox.pending().map(i => i.attempts)).toEqual([0, 0])
    await h.outbox.flush()
    expect(h.outbox.snapshot().waiting).toBe(0)
  })

  it('treats an already-applied create as done', async () => {
    const h = harness([{ kind: 'already-applied' }])
    await h.outbox.enqueue(create)
    await h.outbox.flush()
    expect(h.outbox.snapshot().waiting).toBe(0)
  })

  it('backs off a rejected item, keeps replaying later ones, and surfaces it after max attempts', async () => {
    const h = harness([{ kind: 'rejected', message: '500' }])
    await h.outbox.enqueue(create)
    await h.outbox.enqueue(update)
    await h.outbox.flush()
    expect(h.calls).toHaveLength(2)
    const [first] = h.outbox.pending()
    expect(first.attempts).toBe(1)
    expect(first.nextAttemptAt).toBe(1_000 + backoffMs(1))
    // Not due yet: a flush right away leaves it alone.
    await h.outbox.flush()
    expect(h.calls).toHaveLength(2)

    const failing = harness(Array.from({ length: MAX_ATTEMPTS }, () => ({ kind: 'rejected', message: '500' }) as OutboxFailure))
    await failing.outbox.enqueue(create)
    for (let i = 0; i < MAX_ATTEMPTS; i++) { failing.advance(10 * 60_000); await failing.outbox.flush() }
    expect(failing.outbox.snapshot()).toMatchObject({ waiting: 0, failed: 1 })
    expect(failing.outbox.pending()).toHaveLength(1)
  })

  it('reloads a persisted queue from the store', async () => {
    const store = memoryStore()
    const first = createOutbox({ store, execute: async () => ({ kind: 'offline' }), isOnline: () => false })
    await first.enqueue(create)
    const second = createOutbox({ store, execute: async () => null, isOnline: () => false })
    await second.flush()
    expect(second.snapshot().waiting).toBe(0)
    expect((await store.load())).toHaveLength(0)
  })

  it('emits snapshots to subscribers', async () => {
    const h = harness([{ kind: 'offline' }])
    const seen: number[] = []
    h.outbox.subscribe(s => seen.push(s.waiting))
    await h.outbox.enqueue(create)
    expect(seen[seen.length - 1]).toBe(1)
  })

  it('generates PocketBase-shaped record ids', () => {
    expect(newRecordId()).toMatch(/^[a-z0-9]{15}$/)
  })

  it('labels the sync indicator from the queue', () => {
    expect(syncLabel(true, { waiting: 0, failed: 0, flushing: false })).toBeNull()
    expect(syncLabel(true, { waiting: 1, failed: 0, flushing: false })).toBe('1 CHANGE WAITING')
    expect(syncLabel(true, { waiting: 3, failed: 0, flushing: false })).toBe('3 CHANGES WAITING')
    expect(syncLabel(true, { waiting: 3, failed: 0, flushing: true })).toBe('UPLOADING…')
    expect(syncLabel(true, { waiting: 0, failed: 1, flushing: false })).toBe('NOT SYNCED')
    expect(syncLabel(false, { waiting: 0, failed: 0, flushing: false })).toBe('NOT SYNCED')
  })
})
