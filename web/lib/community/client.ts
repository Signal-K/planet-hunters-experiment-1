// Community reads from the Landnam PocketBase `/api/community` routes: the
// read-only friend world visit and this month's community research total.

import { landnamPbUrl } from '@/lib/pb-config'
import { pbLandnam } from '@/lib/pb-landnam'
import type { CommunityResearch } from '@/lib/research/stamps'
import type { Ballot, BallotsResponse } from './ballots'
import type { ConsensusOverview, ConsensusProject, ConsensusReadout, ConsensusRequest, ConsensusVerdict } from './consensus'
import { queueCommunityPost } from '@/lib/offline/pbOutbox'

export interface FriendWorldSnapshot {
  username: string
  readOnly: true
  /** Keyed by target id; the host's saved Target records (only id/name are read by visitors). */
  discoveredExoplanetTargets?: Record<string, { id: string; name: string }>
}

class CommunityApiError extends Error {
  constructor(message: string, public status: number) {
    super(message)
  }
}

async function communityFetch<T>(path: string): Promise<T> {
  const token = pbLandnam.authStore.token
  const res = await fetch(`${landnamPbUrl().replace(/\/$/, '')}/api/community${path}`, {
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
  })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new CommunityApiError(body?.message || body?.error || `community request failed: ${res.status}`, res.status)
  }
  return body as T
}

/** Read-only visit to a friend's world. The server refuses non-friends and never exposes a write path. */
export function visitFriendWorld(friendId: string): Promise<{ world: FriendWorldSnapshot }> {
  return communityFetch(`/world/${encodeURIComponent(friendId)}`)
}

export { CommunityApiError }

/** SSL-673: this month's community research total, without the caller's own stamps. */
export function fetchCommunityResearch(): Promise<CommunityResearch> {
  return communityFetch('/research')
}

/** SSL-757: the open, pending and closed ballots with the caller's own vote. */
export function fetchBallots(): Promise<BallotsResponse> {
  return communityFetch('/ballots')
}

export type CastVoteResult = { kind: 'saved'; ballot: Ballot } | { kind: 'queued' }

/**
 * Cast or change a vote. The server decides whether the ballot is still open. When the
 * network is down the vote waits in the offline outbox (shown in the sync tray as
 * Community research) and the last choice sent is the one that counts. A rejection from
 * the server (closed, unknown option) is thrown so the screen can say so.
 */
export async function castVote(ballot: string, option: string): Promise<CastVoteResult> {
  const token = pbLandnam.authStore.token
  let res: Response
  try {
    res = await fetch(`${landnamPbUrl().replace(/\/$/, '')}/api/community/vote`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify({ ballot, option }),
    })
  } catch {
    queueCommunityPost('/vote', { ballot, option })
    return { kind: 'queued' }
  }
  const body = await res.json().catch(() => ({}))
  if (res.status === 401 || res.status === 403 || res.status >= 502) {
    queueCommunityPost('/vote', { ballot, option })
    return { kind: 'queued' }
  }
  if (!res.ok) throw new CommunityApiError(body?.message || 'vote failed', res.status)
  return { kind: 'saved', ballot: body.ballot as Ballot }
}

async function communityPost<T>(path: string, body: unknown): Promise<T> {
  const token = pbLandnam.authStore.token
  const res = await fetch(`${landnamPbUrl().replace(/\/$/, '')}/api/community${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify(body),
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) throw new CommunityApiError(json?.message || `community request failed: ${res.status}`, res.status)
  return json as T
}

/** SSL-746: the player's own consensus requests and the queue of others' work to review. */
export function fetchConsensus(): Promise<ConsensusOverview> {
  return communityFetch('/consensus')
}

export function requestConsensus(project: ConsensusProject, subjectId: string, readout: ConsensusReadout): Promise<{ request: ConsensusRequest }> {
  return communityPost('/consensus/request', { project, subjectId, readout })
}

/** Sends the reviewer's own readout and gets the requester's back. Never queued: it needs the answer now. */
export function revealConsensus(request: string, readout: ConsensusReadout): Promise<{ request: { id: string; project: ConsensusProject; subjectId: string; readout: ConsensusReadout } }> {
  return communityPost('/consensus/reveal', { request, readout })
}

export type ConsensusVoteResult = { kind: 'saved' } | { kind: 'queued' }

/** A verdict waits in the offline outbox when the network is down; the last one sent counts. */
export async function castConsensusVote(request: string, verdict: ConsensusVerdict, reason?: string): Promise<ConsensusVoteResult> {
  const body = { request, verdict, reason: reason ?? '' }
  try {
    await communityPost('/consensus/vote', body)
    return { kind: 'saved' }
  } catch (error) {
    if (error instanceof CommunityApiError && error.status !== 401 && error.status !== 403 && error.status < 502) throw error
    queueCommunityPost('/consensus/vote', body)
    return { kind: 'queued' }
  }
}
