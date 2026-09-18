// SSL-320 community client: hub feed, shares, reactions, comments and the
// read-only world visit. Every call goes through the Landnam PocketBase
// `/api/community` routes (pocketbase/community.go), which apply the
// friend/public visibility filter server-side.

import { pbLandnam } from '@/lib/pb-landnam'
import type { HubChannel, ReportReason, ShareComment, SharePost, ShareVisibility, ShareKind } from '@/lib/data/community'
import type { FieldStructureRecord } from '@/lib/game-types'
import type { BiosphereSeed, TerritoryClaim } from '@/lib/data'

export interface FriendWorldSnapshot {
  username: string
  readOnly: true
  fieldStructures?: Record<string, FieldStructureRecord[]>
  territoryClaims?: TerritoryClaim[]
  biosphereSeeds?: Record<string, BiosphereSeed>
  /** Keyed by target id; the host's saved Target records (only id/name are read by visitors). */
  discoveredExoplanetTargets?: Record<string, { id: string; name: string }>
}

export interface ShareInput {
  kind: ShareKind
  programmeId: string
  title: string
  summary?: string
  visibility?: ShareVisibility
  targetId?: string
  divisionId?: string
  snapshot?: Record<string, unknown>
}

class CommunityApiError extends Error {
  constructor(message: string, public status: number) {
    super(message)
  }
}

function baseUrl(): string {
  return (process.env.NEXT_PUBLIC_LANDNAM_PB_URL || 'http://localhost:8093').replace(/\/$/, '')
}

async function communityFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const token = pbLandnam.authStore.token
  const res = await fetch(`${baseUrl()}/api/community${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init?.headers ?? {}),
    },
  })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new CommunityApiError(body?.message || body?.error || `community request failed: ${res.status}`, res.status)
  }
  return body as T
}

export function fetchHubFeed(channel?: HubChannel): Promise<{ posts: SharePost[] }> {
  return communityFetch(`/feed${channel ? `?channel=${encodeURIComponent(channel)}` : ''}`)
}

export function publishShare(input: ShareInput): Promise<{ post: SharePost }> {
  return communityFetch('/share', { method: 'POST', body: JSON.stringify(input) })
}

export function reactToShare(postId: string, reaction: 'signal' | 'build'): Promise<{ post: SharePost }> {
  return communityFetch('/react', { method: 'POST', body: JSON.stringify({ postId, reaction }) })
}

export function fetchShareComments(postId: string): Promise<{ comments: ShareComment[] }> {
  return communityFetch(`/comments/${encodeURIComponent(postId)}`)
}

export function postShareComment(postId: string, body: string): Promise<{ comment: ShareComment }> {
  return communityFetch('/comment', { method: 'POST', body: JSON.stringify({ postId, body }) })
}

/** Report a comment once with a fixed reason. The server hides it at the threshold. */
export function reportShareComment(commentId: string, reason: ReportReason): Promise<{ reportCount: number; hidden: boolean }> {
  return communityFetch('/report', { method: 'POST', body: JSON.stringify({ commentId, reason }) })
}

/** Remove a comment you wrote, or any comment on a post you own. */
export function removeShareComment(commentId: string): Promise<{ removed: true }> {
  return communityFetch(`/comment/${encodeURIComponent(commentId)}/remove`, { method: 'POST' })
}

/** Read-only visit to a friend's world. The server refuses non-friends and never exposes a write path. */
export function visitFriendWorld(friendId: string): Promise<{ world: FriendWorldSnapshot }> {
  return communityFetch(`/world/${encodeURIComponent(friendId)}`)
}

export { CommunityApiError }
