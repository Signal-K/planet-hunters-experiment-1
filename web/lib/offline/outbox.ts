// SSL-321: every server write the client cannot afford to lose goes through
// this queue. Items replay in order (a mission_runs update must land after its
// create), survive reloads and Safari's lack of Background Sync, and carry
// client-generated ids so a request killed mid-flight can be replayed safely.
//
// The module knows nothing about PocketBase: `startOutbox` is handed an
// executor, and tests hand it an in-memory store.

export type OutboxOp =
  | { type: 'create'; collection: string; id: string; data: Record<string, unknown> }
  | { type: 'update'; collection: string; id: string; data: Record<string, unknown> }
  /** A world and its complete structure set must replay together. */
  | { type: 'field-save'; id: string; filter: string; user: string; data: Record<string, unknown>; structures: Record<string, unknown>[] }
  /** A versioned solar field and its rover/cargo, saved as one document. */
  | { type: 'solar-field'; id: string; user: string; site: string; revision: number; state: Record<string, unknown> }
  /** Create-or-update keyed by a PocketBase filter (e.g. one voxel world per user + target). */
  | { type: 'upsert'; collection: string; id: string; filter: string; data: Record<string, unknown> }
  /** A Landnam custom-route call (community API). `body.id` is the client-generated idempotency key. */
  | { type: 'http'; path: string; method: 'POST'; body: Record<string, unknown> }
  /**
   * A create on the shared Star Sailors backend (pbShared), e.g. a full
   * classification capture. `files` maps a file field to a key in the capture
   * blob store (lib/capture/blobStore.ts): images are too large for the
   * localStorage mirror, so the queue item only names them.
   */
  | { type: 'shared-create'; collection: string; id: string; data: Record<string, unknown>; files?: Record<string, string> }

export interface OutboxItem {
  id: string
  op: OutboxOp
  createdAt: number
  attempts: number
  nextAttemptAt: number
  /**
   * Set once attempts reach MAX_ATTEMPTS so the UI can surface a problem.
   * The item is still retried at the capped backoff: a temporary server-side
   * rejection must not turn into a permanently stranded Safari outbox item.
   */
  failed: boolean
  lastError?: string
}

export interface OutboxSnapshot {
  waiting: number
  failed: number
  flushing: boolean
}

/** How an executor reports a failed attempt. */
export type OutboxFailure =
  /** No connection or auth not ready: keep the item, do not burn an attempt, stop this flush. */
  | { kind: 'offline' }
  /** The server already has this record: the write counts as done. */
  | { kind: 'already-applied' }
  /** The server refused or errored: count an attempt and back off. */
  | { kind: 'rejected'; message: string }
  /** The server rejected the payload itself (e.g. HTTP 400): retrying cannot help, so drop it. */
  | { kind: 'invalid'; message: string }

export interface OutboxStore {
  load(): Promise<OutboxItem[]>
  save(items: OutboxItem[]): Promise<void>
}

export const MAX_ATTEMPTS = 5
const BASE_BACKOFF_MS = 2_000
const MAX_BACKOFF_MS = 5 * 60_000
const FLUSH_INTERVAL_MS = 30_000

export function backoffMs(attempts: number): number {
  return Math.min(MAX_BACKOFF_MS, BASE_BACKOFF_MS * 2 ** Math.max(0, attempts - 1))
}

/** PocketBase record ids are 15 lowercase alphanumerics; client ids match so creates are idempotent. */
export function newRecordId(random: () => number = Math.random): string {
  const alphabet = 'abcdefghijklmnopqrstuvwxyz0123456789'
  let out = ''
  for (let i = 0; i < 15; i++) out += alphabet[Math.floor(random() * alphabet.length)]
  return out
}

export function memoryStore(initial: OutboxItem[] = []): OutboxStore {
  let items = initial.map(i => ({ ...i }))
  return {
    load: async () => items.map(i => ({ ...i })),
    save: async next => { items = next.map(i => ({ ...i })) },
  }
}

const DB_NAME = 'landnam-outbox'
const DB_STORE = 'queue'
const DB_KEY = 'items'
const MIRROR_KEY = 'landnam-outbox-v1'

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1)
    req.onupgradeneeded = () => req.result.createObjectStore(DB_STORE)
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

interface StoredQueue { version: number; items: OutboxItem[] }

function storedQueue(value: unknown): StoredQueue | null {
  if (Array.isArray(value)) return { version: 0, items: value as OutboxItem[] }
  if (value && typeof value === 'object' && 'version' in value && 'items' in value
    && typeof value.version === 'number' && Number.isSafeInteger(value.version) && Array.isArray(value.items)) {
    return value as StoredQueue
  }
  return null
}

function readMirror(): StoredQueue | null {
  try {
    const raw = window.localStorage.getItem(MIRROR_KEY)
    return raw ? storedQueue(JSON.parse(raw)) : null
  } catch {
    return null
  }
}

function writeMirror(queue: StoredQueue): boolean {
  try {
    // Preserve an empty version too, so a stale DB cannot resurrect a write.
    window.localStorage.setItem(MIRROR_KEY, JSON.stringify(queue))
    return true
  } catch {
    // Storage full or blocked: IndexedDB is still the primary copy.
    return false
  }
}

/**
 * IndexedDB is the primary store; a localStorage mirror covers Safari private
 * windows and eviction edge cases where one of the two is unavailable. On
 * Versioned copies let a successful removal beat a stale longer mirror.
 * Older unversioned queues still use the longer copy during migration.
 */
export function browserStore(): OutboxStore {
  let version = 0
  let writeTail: Promise<void> = Promise.resolve()
  return {
    async load() {
      const mirror = readMirror()
      try {
        const db = await openDb()
        const fromDb = await new Promise<StoredQueue | null>((resolve, reject) => {
          const req = db.transaction(DB_STORE, 'readonly').objectStore(DB_STORE).get(DB_KEY)
          req.onsuccess = () => resolve(storedQueue(req.result))
          req.onerror = () => reject(req.error)
        })
        db.close()
        const candidates = [fromDb, mirror].filter((item): item is StoredQueue => item !== null)
        candidates.sort((a, b) => b.version - a.version || b.items.length - a.items.length)
        version = candidates[0]?.version ?? 0
        return candidates[0]?.items ?? []
      } catch {
        version = mirror?.version ?? 0
        return mirror?.items ?? []
      }
    },
    async save(items) {
      const copy = JSON.parse(JSON.stringify(items)) as OutboxItem[]
      const write = writeTail.catch(() => {}).then(async () => {
        const queue = { version: ++version, items: copy }
        const mirrored = writeMirror(queue)
        try {
          const db = await openDb()
          await new Promise<void>((resolve, reject) => {
            const tx = db.transaction(DB_STORE, 'readwrite')
            tx.objectStore(DB_STORE).put(queue, DB_KEY)
            tx.oncomplete = () => resolve()
            tx.onerror = () => reject(tx.error)
          })
          db.close()
        } catch {
          if (!mirrored) throw new Error('Unable to store offline changes on this device')
        }
      })
      writeTail = write
      return write
    },
  }
}

export interface Outbox {
  enqueue(op: OutboxOp): Promise<void>
  flush(): Promise<void>
  snapshot(): OutboxSnapshot
  subscribe(listener: (snapshot: OutboxSnapshot) => void): () => void
  /** Registers online / visibility / pageshow / timer triggers. Returns a teardown. */
  start(): () => void
  /** Items still queued, oldest first (for tests and diagnostics). */
  pending(): OutboxItem[]
  /** Whether any queued item (including one only in the persisted store) matches. */
  has(match: (op: OutboxOp) => boolean): Promise<boolean>
  /** Drops matching items, e.g. a game_states save for an account that was just reset. */
  discard(match: (op: OutboxOp) => boolean): Promise<number>
}

export interface OutboxOptions {
  store: OutboxStore
  execute: (op: OutboxOp) => Promise<OutboxFailure | null>
  now?: () => number
  isOnline?: () => boolean
}

export function createOutbox({ store, execute, now = Date.now, isOnline = () => true }: OutboxOptions): Outbox {
  let items: OutboxItem[] = []
  let loaded: Promise<void> | null = null
  let flushing: Promise<void> | null = null
  // Set when something is enqueued mid-flush, so it is sent by a follow-up
  // pass instead of waiting for the next online/visibility/timer trigger.
  let flushAgain = false
  const listeners = new Set<(snapshot: OutboxSnapshot) => void>()

  const ensureLoaded = () => (loaded ??= store.load().then(loadedItems => {
    // Anything enqueued before the load finished keeps its place at the end.
    items = [...loadedItems, ...items]
  }))

  const snapshot = (): OutboxSnapshot => ({
    waiting: items.filter(i => !i.failed).length,
    failed: items.filter(i => i.failed).length,
    flushing: flushing !== null,
  })
  const emit = () => { const s = snapshot(); listeners.forEach(l => l(s)) }
  const persist = () => store.save(items)

  async function enqueue(op: OutboxOp) {
    await ensureLoaded()
    // Only the latest snapshot of a keyed upsert matters; drop superseded ones.
    if (op.type === 'upsert') {
      items = items.filter(i => !(i.op.type === 'upsert' && i.op.collection === op.collection && i.op.filter === op.filter))
    }
    if (op.type === 'field-save') {
      // A complete snapshot also supersedes the old per-row field queue.
      // Otherwise a backed-off legacy write could replay after this snapshot
      // and restore stale terrain or a structure the player removed.
      items = items.filter(i => {
        const previous = i.op
        if (previous.type === 'field-save') return previous.filter !== op.filter
        if (previous.type !== 'upsert') return true
        if (previous.collection === 'voxel_worlds') return previous.filter !== op.filter
        if (previous.collection === 'structures') return !previous.filter.startsWith(`${op.filter} && structure_id = `)
        return true
      })
    }
    const item = { id: newRecordId(), op, createdAt: now(), attempts: 0, nextAttemptAt: 0, failed: false }
    items.push(item)
    try { await persist() } catch (error) {
      // A field save that never reached either durable store must not later
      // replay as a phantom write after its caller was told it failed.
      if (op.type === 'solar-field') items = items.filter(queued => queued !== item)
      throw error
    }
    emit()
    if (isOnline()) void flush()
  }

  async function run() {
    await ensureLoaded()
    emit()
    const blockedSolarSites = new Set<string>()
    for (const item of [...items]) {
      // Enqueue can replace a queued snapshot while an earlier request is in
      // flight. Do not execute entries removed from this pass in the meantime.
      if (!items.includes(item)) continue
      // A failed item is deliberately retained and retried. `failed` is a
      // user-visible warning threshold, not a terminal state.
      const solarKey = item.op.type === 'solar-field' ? `${item.op.user}:${item.op.site}` : null
      if (solarKey && blockedSolarSites.has(solarKey)) continue
      if (item.nextAttemptAt > now()) {
        if (solarKey) blockedSolarSites.add(solarKey)
        continue
      }
      const failure = await execute(item.op)
      if (failure === null || failure.kind === 'already-applied') {
        items = items.filter(i => i !== item)
      } else if (failure.kind === 'offline') {
        break
      } else if (failure.kind === 'invalid') {
        // SSL-402: a rejected payload would loop forever and pin the sync banners.
        console.warn('[outbox] dropping write the server rejected', item.op, failure.message)
        items = items.filter(i => i !== item)
      } else {
        if (solarKey) blockedSolarSites.add(solarKey)
        item.attempts += 1
        item.lastError = failure.message
        item.failed = item.attempts >= MAX_ATTEMPTS
        item.nextAttemptAt = now() + backoffMs(item.attempts)
      }
      await persist()
      emit()
    }
  }

  function flush(): Promise<void> {
    if (flushing) {
      flushAgain = true
      return flushing
    }
    flushing = run().finally(() => {
      flushing = null
      emit()
      if (flushAgain) {
        flushAgain = false
        if (isOnline()) void flush()
      }
    })
    return flushing
  }

  function start(): () => void {
    if (typeof window === 'undefined') return () => {}
    const kick = () => { if (isOnline()) void flush() }
    const onVisible = () => { if (document.visibilityState === 'visible') kick() }
    window.addEventListener('online', kick)
    window.addEventListener('pageshow', kick)
    document.addEventListener('visibilitychange', onVisible)
    const timer = window.setInterval(kick, FLUSH_INTERVAL_MS)
    kick()
    return () => {
      window.removeEventListener('online', kick)
      window.removeEventListener('pageshow', kick)
      document.removeEventListener('visibilitychange', onVisible)
      window.clearInterval(timer)
    }
  }

  return {
    enqueue,
    flush,
    snapshot,
    subscribe(listener) {
      listeners.add(listener)
      listener(snapshot())
      return () => { listeners.delete(listener) }
    },
    start,
    pending: () => items.map(i => ({ ...i })),
    async has(match) {
      await ensureLoaded()
      return items.some(i => match(i.op))
    },
    async discard(match) {
      await ensureLoaded()
      const before = items.length
      items = items.filter(i => !match(i.op))
      const dropped = before - items.length
      if (dropped > 0) {
        await persist()
        emit()
      }
      return dropped
    },
  }
}
