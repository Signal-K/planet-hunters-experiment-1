import PocketBase, { type RecordModel } from 'pocketbase'

export const pbLandnam = new PocketBase(
  process.env.NEXT_PUBLIC_LANDNAM_PB_URL || 'http://localhost:8093'
)

/**
 * Exchanges a verified shared-backend session token for a real, native
 * PocketBase auth token scoped to Landnam's own "users" auth collection.
 *
 * Landnam's own PocketBase never sees the shared backend's session (players
 * authenticate against `pbShared`, not `pbLandnam`), so without this
 * exchange `@request.auth` is always empty here and ownership rules on
 * game_states/mission_log (`user = @request.auth.id`) can't be enforced.
 * Call this once the shared backend session is confirmed valid, then feed
 * the result into `pbLandnam.authStore.save(token, record)`.
 *
 * Throws on failure (network error, 401 from an invalid/expired shared
 * token, etc.) — callers should treat this the same as any other
 * offline-tolerant backend call.
 */
export async function exchangeLandnamAuth(sharedToken: string): Promise<{
  token: string
  record: RecordModel
}> {
  const base = (process.env.NEXT_PUBLIC_LANDNAM_PB_URL || 'http://localhost:8093').replace(/\/$/, '')
  const res = await fetch(`${base}/api/landnam-auth/exchange`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${sharedToken}` },
  })
  if (!res.ok) {
    throw new Error(`landnam-auth exchange failed: ${res.status}`)
  }
  return res.json()
}
