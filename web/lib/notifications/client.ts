import { landnamPbUrl } from '@/lib/pb-config'
import { pbLandnam } from '@/lib/pb-landnam'

export interface FriendRequestNotification {
  id: string
  kind: 'friend_request'
  title: string
  body: string
  createdAt: string
  action: { friendshipId: string }
}

// Keep this union open. Autonomous mission and scanning notifications join the
// same inbox as new kinds instead of growing a second top-level UI surface.
export type PlayerNotification = FriendRequestNotification

export async function listNotifications(): Promise<{ notifications: PlayerNotification[] }> {
  const token = pbLandnam.authStore.token
  const response = await fetch(`${landnamPbUrl().replace(/\/$/, '')}/api/notifications`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  })
  const body = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(body?.message || 'Unable to load notifications.')
  return body as { notifications: PlayerNotification[] }
}
