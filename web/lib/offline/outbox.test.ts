import { describe, expect, it, vi } from 'vitest'
import { syncLabel } from '@/components/game/LandnamSyncStatus'
import { backoffMs, createOutbox, MAX_ATTEMPTS, memoryStore, newRecordId, type OutboxFailure, type OutboxOp } from './outbox'
import { classifyHttpStatus, replayFieldSave } from './pbOutbox'

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

  it('replaces a field and its complete structure set as one queued change', async () => {
    const h = harness([])
    const save = (structures: Record<string, unknown>[]): OutboxOp => ({
      type: 'field-save', id: 'bbbbbbbbbbbbbbb', filter: 'user = "u1" && target_id = "mars"',
      user: 'u1', data: {}, structures,
    })
    await h.outbox.enqueue(save([{ structure_id: 'old' }]))
    await h.outbox.enqueue(save([{ structure_id: 'new' }]))
    expect(h.outbox.pending()).toHaveLength(1)
    await h.outbox.flush()
    expect(h.calls[0].type === 'field-save' && h.calls[0].structures).toEqual([{ structure_id: 'new' }])
  })

  it('supersedes older world and structure upserts only for the same field', async () => {
    const h = harness([])
    const filter = 'user = "u1" && target_id = "mars"'
    await h.outbox.enqueue({ type: 'upsert', collection: 'voxel_worlds', id: 'world', filter, data: {} })
    await h.outbox.enqueue({ type: 'upsert', collection: 'structures', id: 'structure', filter: `${filter} && structure_id = "old"`, data: {} })
    await h.outbox.enqueue({ type: 'upsert', collection: 'voxel_worlds', id: 'other', filter: 'user = "u1" && target_id = "moon"', data: {} })
    await h.outbox.enqueue({ type: 'field-save', id: 'new', filter, user: 'u1', data: {}, structures: [] })
    expect(h.outbox.pending().map(item => item.op.type === 'http' ? item.op.path : item.op.id)).toEqual(['other', 'new'])
  })

  it('does not replay a superseded legacy write captured by an active flush', async () => {
    let release: () => void = () => {}
    const gate = new Promise<void>(resolve => { release = resolve })
    const calls: OutboxOp[] = []
    const outbox = createOutbox({
      store: memoryStore(), isOnline: () => false,
      execute: async op => { calls.push(op); if (calls.length === 1) await gate; return null },
    })
    const filter = 'user = "u1" && target_id = "mars"'
    await outbox.enqueue(create)
    await outbox.enqueue({ type: 'upsert', collection: 'structures', id: 'old', filter: `${filter} && structure_id = "old"`, data: {} })
    const flushing = outbox.flush()
    await vi.waitFor(() => expect(calls).toHaveLength(1))
    await outbox.enqueue({ type: 'field-save', id: 'new', filter, user: 'u1', data: {}, structures: [] })
    release()
    await flushing
    await outbox.flush()
    expect(calls.map(op => op.type === 'http' ? op.path : op.id)).toEqual([create.id, 'new'])
  })

  it('replays a complete field, including structure updates and removals', async () => {
    const op: Extract<OutboxOp, { type: 'field-save' }> = {
      type: 'field-save', id: 'world-id', filter: 'owner', user: 'u1', data: { time: 2 },
      structures: [{ structure_id: 'keep', pos_x: 4 }, { structure_id: 'new' }],
    }
    const worlds = {
      getFirstListItem: vi.fn().mockResolvedValue({ id: 'world' }),
      getFullList: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn(),
    }
    const structures = {
      getFirstListItem: vi.fn(),
      getFullList: vi.fn().mockResolvedValue([{ id: 'one', structure_id: 'keep' }, { id: 'two', structure_id: 'removed' }]),
      create: vi.fn(), update: vi.fn(), delete: vi.fn(),
    }
    await replayFieldSave(op, worlds, structures)
    expect(worlds.update).toHaveBeenCalledWith('world', { time: 2 })
    expect(structures.update).toHaveBeenCalledWith('one', op.structures[0])
    expect(structures.create).toHaveBeenCalledWith(op.structures[1])
    expect(structures.delete).toHaveBeenCalledWith('two')
  })

  it('sends a write enqueued mid-flush in a follow-up pass', async () => {
    const calls: OutboxOp[] = []
    let release: () => void = () => {}
    const gate = new Promise<void>(resolve => { release = resolve })
    const outbox = createOutbox({
      store: memoryStore(),
      execute: async op => { calls.push(op); if (calls.length === 1) await gate; return null },
      isOnline: () => true,
    })
    const upsert = (time: number): OutboxOp => ({ type: 'upsert', collection: 'game_states', id: 'ccccccccccccccc', filter: 'user = "u1"', data: { time } })
    await outbox.enqueue(upsert(1))
    await outbox.enqueue(upsert(2))
    release()
    await vi.waitFor(() => expect(outbox.pending()).toHaveLength(0))
    expect(calls.map(c => (c.type === 'upsert' ? c.data.time : null))).toEqual([1, 2])
  })

  it('never sends a later solar revision before a failed earlier revision', async () => {
    const h = harness([{ kind: 'rejected', message: 'conflict' }])
    const save = (site: string, revision: number): OutboxOp => ({
      type: 'solar-field', id: `operation-${site}-${revision}`, site, user: 'u1', revision, state: {},
    })
    await h.outbox.enqueue(save('mars:east', 0))
    await h.outbox.enqueue(save('mars:east', 1))
    await h.outbox.enqueue(save('moon:prime', 0))
    await h.outbox.flush()
    expect(h.calls.map(op => op.type === 'solar-field' && [op.site, op.revision])).toEqual([['mars:east', 0], ['moon:prime', 0]])
    await h.outbox.flush()
    expect(h.calls).toHaveLength(2)
    h.advance(backoffMs(1))
    await h.outbox.flush()
    expect(h.calls.slice(2).map(op => op.type === 'solar-field' && op.revision)).toEqual([0, 1])
  })

  it('reports and discards matching queued writes', async () => {
    const h = harness([])
    const save = (user: string): OutboxOp => ({ type: 'upsert', collection: 'game_states', id: 'ddddddddddddddd', filter: `user = "${user}"`, data: {} })
    await h.outbox.enqueue(save('u1'))
    await h.outbox.enqueue(save('u2'))
    await h.outbox.enqueue(create)
    const isU1 = (op: OutboxOp) => op.type === 'upsert' && op.filter === 'user = "u1"'
    expect(await h.outbox.has(isU1)).toBe(true)
    expect(await h.outbox.discard(isU1)).toBe(1)
    expect(await h.outbox.has(isU1)).toBe(false)
    expect(h.outbox.pending().map(i => i.op.type)).toEqual(['upsert', 'create'])
  })

  it('classifies community HTTP statuses for retry', () => {
    expect(classifyHttpStatus(200)).toBeNull()
    expect(classifyHttpStatus(401)).toEqual({ kind: 'offline' })
    expect(classifyHttpStatus(503)).toEqual({ kind: 'offline' })
    expect(classifyHttpStatus(400)).toMatchObject({ kind: 'invalid' })
    expect(classifyHttpStatus(500)).toMatchObject({ kind: 'rejected' })
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

  it('drops a write the server rejected as invalid so the banners can clear (SSL-402)', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const h = harness([{ kind: 'invalid', message: '400 validation_required' }])
    await h.outbox.enqueue(create)
    await h.outbox.enqueue(update)
    await h.outbox.flush()
    expect(h.calls).toHaveLength(2)
    expect(h.outbox.snapshot()).toMatchObject({ waiting: 0, failed: 0 })
    warn.mockRestore()
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

  it('retries a surfaced failure and clears it when the server recovers', async () => {
    const results: OutboxFailure[] = [
      ...Array.from({ length: MAX_ATTEMPTS }, () => ({ kind: 'rejected', message: '500' }) as OutboxFailure),
    ]
    const h = harness(results)
    await h.outbox.enqueue(create)
    for (let i = 0; i < MAX_ATTEMPTS; i++) {
      h.advance(10 * 60_000)
      await h.outbox.flush()
    }
    expect(h.outbox.snapshot()).toMatchObject({ waiting: 0, failed: 1 })

    h.advance(10 * 60_000)
    await h.outbox.flush()

    expect(h.outbox.snapshot()).toMatchObject({ waiting: 0, failed: 0 })
    expect(h.outbox.pending()).toHaveLength(0)
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
    expect(syncLabel(true, { waiting: 0, failed: 0, flushing: false }, false)).toBe('OFFLINE')
    expect(syncLabel(true, { waiting: 2, failed: 0, flushing: false }, false)).toBe('OFFLINE · 2')
  })
})
