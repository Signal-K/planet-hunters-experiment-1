// Images waiting to go up with a classification capture. They live in their
// own IndexedDB store, keyed by `<recordId>:<field>`, because the outbox also
// mirrors itself into localStorage, which cannot hold images.

const DB_NAME = 'landnam-capture-blobs'
const STORE = 'blobs'

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1)
    req.onupgradeneeded = () => req.result.createObjectStore(STORE)
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

async function run<T>(mode: IDBTransactionMode, fn: (store: IDBObjectStore) => IDBRequest<T> | void): Promise<T | undefined> {
  const db = await openDb()
  try {
    return await new Promise<T | undefined>((resolve, reject) => {
      const tx = db.transaction(STORE, mode)
      const req = fn(tx.objectStore(STORE))
      let result: T | undefined
      if (req) req.onsuccess = () => { result = req.result }
      tx.oncomplete = () => resolve(result)
      tx.onerror = () => reject(tx.error)
      tx.onabort = () => reject(tx.error)
    })
  } finally {
    db.close()
  }
}

/** Stores the blob; false when IndexedDB is unavailable (the capture still goes, without it). */
export async function putCaptureBlob(key: string, blob: Blob): Promise<boolean> {
  if (typeof indexedDB === 'undefined') return false
  try {
    await run('readwrite', store => { store.put(blob, key) })
    return true
  } catch {
    return false
  }
}

export async function readCaptureBlob(key: string): Promise<Blob | null> {
  if (typeof indexedDB === 'undefined') return null
  try {
    const value = await run<unknown>('readonly', store => store.get(key))
    return value instanceof Blob ? value : null
  } catch {
    return null
  }
}

export async function deleteCaptureBlobs(keys: string[]): Promise<void> {
  if (!keys.length || typeof indexedDB === 'undefined') return
  try {
    await run('readwrite', store => { for (const key of keys) store.delete(key) })
  } catch {
    // Left behind: harmless, and overwritten if the id ever recurs.
  }
}
