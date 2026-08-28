import { pbLandnam } from '@/lib/pb-landnam'

export interface FriendPublicUser {
  id: string
  username: string
}

export interface FriendEntry extends FriendPublicUser {
  friendshipId: string
  giftSentToday?: boolean
}

export interface FriendsListResponse {
  me: FriendPublicUser
  friends: FriendEntry[]
  incoming: FriendEntry[]
  outgoing: FriendEntry[]
}

export interface FriendBaseSnapshot {
  username: string
  missionsDone?: number
  placed?: string[]
  freeOperations?: boolean
  unlockedBlueprints?: string[]
}

export type FriendGiftKind = 'currency' | 'resource' | 'blueprint'

export interface FriendGiftPayload {
  amount?: number
  mineral?: string
  slug?: string
}

export interface FriendGiftInboxEntry {
  id: string
  from: string
  kind: FriendGiftKind
  payload: FriendGiftPayload
  receivedAt: string
}

class FriendsApiError extends Error {
  constructor(message: string, public status: number) {
    super(message)
  }
}

function baseUrl(): string {
  return (process.env.NEXT_PUBLIC_LANDNAM_PB_URL || 'http://localhost:8093').replace(/\/$/, '')
}

async function friendsFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const token = pbLandnam.authStore.token
  const res = await fetch(`${baseUrl()}/api/friends${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init?.headers ?? {}),
    },
  })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new FriendsApiError(body?.message || body?.error || `friends request failed: ${res.status}`, res.status)
  }
  return body as T
}

export function searchFriendCandidates(query: string): Promise<{ results: FriendPublicUser[] }> {
  return friendsFetch(`/search?q=${encodeURIComponent(query)}`)
}

export function setFriendUsername(username: string): Promise<FriendPublicUser> {
  return friendsFetch('/username', { method: 'POST', body: JSON.stringify({ username }) })
}

export function sendFriendRequest(username: string): Promise<{ friendship: { id: string; status: string } }> {
  return friendsFetch('/request', { method: 'POST', body: JSON.stringify({ username }) })
}

export function respondToFriendRequest(friendshipId: string, accept: boolean) {
  return friendsFetch('/respond', { method: 'POST', body: JSON.stringify({ friendshipId, accept }) })
}

export function removeFriendship(friendshipId: string) {
  return friendsFetch(`/${friendshipId}`, { method: 'DELETE' })
}

export function listFriends(): Promise<FriendsListResponse> {
  return friendsFetch('/list')
}

export function viewFriendBase(friendId: string): Promise<{ base: FriendBaseSnapshot }> {
  return friendsFetch(`/base/${friendId}`)
}

export function sendFriendGift(recipientId: string, kind: FriendGiftKind) {
  return friendsFetch('/gift/send', { method: 'POST', body: JSON.stringify({ recipientId, kind }) })
}

export function friendGiftInbox(): Promise<{ gifts: FriendGiftInboxEntry[] }> {
  return friendsFetch('/gift/inbox')
}

export function claimFriendGift(giftId: string): Promise<{ kind: FriendGiftKind; payload: FriendGiftPayload }> {
  return friendsFetch('/gift/claim', { method: 'POST', body: JSON.stringify({ giftId }) })
}

export { FriendsApiError }
