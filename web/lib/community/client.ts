// Community research total, read from the Landnam PocketBase `/api/community/research` route.

import { landnamPbUrl } from '@/lib/pb-config'
import { pbLandnam } from '@/lib/pb-landnam'
import type { CommunityResearch } from '@/lib/research/stamps'

/** SSL-673: this month's community research total, without the caller's own stamps. */
export async function fetchCommunityResearch(): Promise<CommunityResearch> {
  const token = pbLandnam.authStore.token
  const res = await fetch(`${landnamPbUrl().replace(/\/$/, '')}/api/community/research`, {
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
  })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(body?.message || body?.error || `community request failed: ${res.status}`)
  return body as CommunityResearch
}
