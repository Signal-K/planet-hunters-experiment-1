// Community reads from the Landnam PocketBase `/api/community` routes: the
// read-only friend world visit and this month's community research total.

import { landnamPbUrl } from '@/lib/pb-config'
import { pbLandnam } from '@/lib/pb-landnam'
import type { CommunityResearch } from '@/lib/research/stamps'

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
