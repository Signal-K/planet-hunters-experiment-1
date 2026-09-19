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
export function classifyPbError(op: OutboxOp, error: unknown): OutboxFailure {
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

async function executeOnPocketBase(op: OutboxOp): Promise<OutboxFailure | null> {
  try {
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

export function queueUpdate(collection: string, id: string, data: Record<string, unknown>): void {
  void getOutbox().enqueue({ type: 'update', collection, id, data })
}
