// SSL-321: the app-wide outbox, wired to Landnam's PocketBase. Call
// `queueCreate` / `queueUpdate` instead of `pbLandnam.collection(...).create`
// for any write that must survive being offline.

import { ClientResponseError } from 'pocketbase'
import { pbLandnam } from '@/lib/pb-landnam'
import { createOutbox, browserStore, memoryStore, newRecordId, type Outbox, type OutboxFailure, type OutboxOp } from './outbox'

interface PbErrorBody {
  data?: Record<string, { code?: string } | undefined>
}

/** Turn a PocketBase error into the outbox's retry vocabulary. */
function classifyPbError(op: OutboxOp, error: unknown): OutboxFailure {
  if (!(error instanceof ClientResponseError)) return { kind: 'offline' }
  // status 0 is fetch failing outright: offline, aborted, or backgrounded.
  if (error.status === 0) return { kind: 'offline' }
  // The Landnam session is not ready (exchange pending): wait, do not burn attempts.
  if (error.status === 401 || error.status === 403) return { kind: 'offline' }
  if (op.type === 'create' && (error.status === 400 || error.status === 409)) {
    const body = error.response as PbErrorBody
    if (body?.data?.id?.code === 'validation_not_unique') return { kind: 'already-applied' }
  }
  return { kind: 'rejected', message: `${error.status} ${error.message}` }
}

function landnamBaseUrl(): string {
  return (process.env.NEXT_PUBLIC_LANDNAM_PB_URL || 'http://localhost:8093').replace(/\/$/, '')
}

async function executeHttp(op: Extract<OutboxOp, { type: 'http' }>): Promise<OutboxFailure | null> {
  const token = pbLandnam.authStore.token
  // No session yet (exchange pending): wait rather than burn an attempt on a guaranteed 401.
  if (!token) return { kind: 'offline' }
  let res: Response
  try {
    res = await fetch(`${landnamBaseUrl()}${op.path}`, {
      method: op.method,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(op.body),
    })
  } catch {
    return { kind: 'offline' }
  }
  return classifyHttpStatus(res.status)
}

export function classifyHttpStatus(status: number): OutboxFailure | null {
  if (status >= 200 && status < 300) return null
  if (status === 401 || status === 403 || status === 408 || status === 429 || status >= 502) return { kind: 'offline' }
  return { kind: 'rejected', message: `${status}` }
}

async function executeOnPocketBase(op: OutboxOp): Promise<OutboxFailure | null> {
  try {
    if (op.type === 'http') return await executeHttp(op)
    if (op.type === 'upsert') {
      const collection = pbLandnam.collection(op.collection)
      const existing = await collection.getFirstListItem(op.filter).catch((error: unknown) => {
        if (error instanceof ClientResponseError && error.status === 404) return null
        throw error
      })
      if (existing) await collection.update(existing.id, op.data)
      else await collection.create({ id: op.id, ...op.data })
      return null
    }
    if (op.type === 'create') await pbLandnam.collection(op.collection).create({ id: op.id, ...op.data })
    else await pbLandnam.collection(op.collection).update(op.id, op.data)
    return null
  } catch (error) {
    return classifyPbError(op, error)
  }
}

let instance: Outbox | null = null

/** Browser-only singleton; server renders get an inert in-memory instance. */
export function getOutbox(): Outbox {
  if (!instance) {
    instance = createOutbox({
      store: typeof window === 'undefined' ? memoryStore() : browserStore(),
      execute: executeOnPocketBase,
      isOnline: () => typeof navigator === 'undefined' || navigator.onLine !== false,
    })
  }
  return instance
}

export function queueCreate(collection: string, data: Record<string, unknown>, id: string = newRecordId()): string {
  void getOutbox().enqueue({ type: 'create', collection, id, data })
  return id
}

/** Create-or-update the record matching `filter`; safe to replay. */
export function queueUpsert(collection: string, filter: string, data: Record<string, unknown>): void {
  void getOutbox().enqueue({ type: 'upsert', collection, id: newRecordId(), filter, data })
}

export function queueUpdate(collection: string, id: string, data: Record<string, unknown>): void {
  void getOutbox().enqueue({ type: 'update', collection, id, data })
}
