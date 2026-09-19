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

export interface OutboxItem {
  id: string
  op: OutboxOp
  createdAt: number
  attempts: number
  nextAttemptAt: number
  /** Set once attempts reach MAX_ATTEMPTS; kept in the queue and surfaced, never dropped. */
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

function readMirror(): OutboxItem[] {
  try {
    const raw = window.localStorage.getItem(MIRROR_KEY)
    return raw ? (JSON.parse(raw) as OutboxItem[]) : []
  } catch {
    return []
  }
}

function writeMirror(items: OutboxItem[]) {
  try {
    if (items.length === 0) window.localStorage.removeItem(MIRROR_KEY)
    else window.localStorage.setItem(MIRROR_KEY, JSON.stringify(items))
  } catch {
    // Storage full or blocked: IndexedDB is still the primary copy.
  }
}

/**
 * IndexedDB is the primary store; a localStorage mirror covers Safari private
 * windows and eviction edge cases where one of the two is unavailable. On
 * load the longer of the two wins, so neither copy can silently shrink the
 * queue.
 */
export function browserStore(): OutboxStore {
  return {
    async load() {
      const mirror = readMirror()
      try {
        const db = await openDb()
        const fromDb = await new Promise<OutboxItem[]>((resolve, reject) => {
          const req = db.transaction(DB_STORE, 'readonly').objectStore(DB_STORE).get(DB_KEY)
          req.onsuccess = () => resolve((req.result as OutboxItem[] | undefined) ?? [])
          req.onerror = () => reject(req.error)
        })
        db.close()
        return fromDb.length >= mirror.length ? fromDb : mirror
      } catch {
        return mirror
      }
    },
    async save(items) {
      writeMirror(items)
      try {
        const db = await openDb()
        await new Promise<void>((resolve, reject) => {
          const tx = db.transaction(DB_STORE, 'readwrite')
          tx.objectStore(DB_STORE).put(items, DB_KEY)
          tx.oncomplete = () => resolve()
          tx.onerror = () => reject(tx.error)
        })
        db.close()
      } catch {
        // The mirror already holds the queue.
      }
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
    items.push({ id: newRecordId(), op, createdAt: now(), attempts: 0, nextAttemptAt: 0, failed: false })
    await persist()
    emit()
    if (isOnline()) void flush()
  }

  async function run() {
    await ensureLoaded()
    emit()
    for (const item of [...items]) {
      if (item.failed || item.nextAttemptAt > now()) continue
      const failure = await execute(item.op)
      if (failure === null || failure.kind === 'already-applied') {
        items = items.filter(i => i !== item)
      } else if (failure.kind === 'offline') {
        break
      } else {
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
    if (flushing) return flushing
    flushing = run().finally(() => { flushing = null; emit() })
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
  }
}
