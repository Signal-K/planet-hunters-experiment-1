/**
 * Offline cache of the full game save in IndexedDB (SSL-554; primary hydration source since SSL-559).
 *
 * localStorage stays the synchronous hydration source, but browsers evict it
 * (Safari ITP, storage pressure) and its quota is small. Every persisted save
 * is mirrored here, and hydration falls back to this copy when the
 * localStorage slot is missing, so an offline PWA session never starts empty.
 * PocketBase remains the source of truth once reachable (mergeRemoteState).
 */
const DB_NAME = 'landnam-state'
const DB_STORE = 'saves'

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1)
    req.onupgradeneeded = () => req.result.createObjectStore(DB_STORE)
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

export async function cacheSave(key: string, json: string): Promise<void> {
  if (typeof indexedDB === 'undefined') return
  try {
    const db = await openDb()
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(DB_STORE, 'readwrite')
      tx.objectStore(DB_STORE).put(json, key)
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
    db.close()
  } catch {
    // Blocked or full: localStorage still holds the save.
  }
}

/** Hydration must never hang on a stuck IndexedDB open (Safari): give up after `timeoutMs`. */
export function readCachedSave(key: string, timeoutMs = 800): Promise<string | null> {
  return Promise.race([readCachedSaveNow(key), new Promise<null>(resolve => setTimeout(() => resolve(null), timeoutMs))])
}

async function readCachedSaveNow(key: string): Promise<string | null> {
  if (typeof indexedDB === 'undefined') return null
  try {
    const db = await openDb()
    const value = await new Promise<unknown>((resolve, reject) => {
      const req = db.transaction(DB_STORE, 'readonly').objectStore(DB_STORE).get(key)
      req.onsuccess = () => resolve(req.result)
      req.onerror = () => reject(req.error)
    })
    db.close()
    return typeof value === 'string' ? value : null
  } catch {
    return null
  }
}

export async function dropCachedSave(key: string): Promise<void> {
  if (typeof indexedDB === 'undefined') return
  try {
    const db = await openDb()
    await new Promise<void>(resolve => {
      const tx = db.transaction(DB_STORE, 'readwrite')
      tx.objectStore(DB_STORE).delete(key)
      tx.oncomplete = () => resolve(); tx.onerror = () => resolve()
    })
    db.close()
  } catch { /* nothing cached */ }
}
