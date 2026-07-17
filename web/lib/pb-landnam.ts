import PocketBase, { LocalAuthStore, type RecordModel } from 'pocketbase'

// Explicit, distinct storage key — PocketBase's SDK defaults every client to
// the same localStorage key ('pocketbase_auth') when none is given, so
// without this, pbLandnam's authStore.save() (called after every exchange —
// see exchangeLandnamAuth below) silently overwrites pbShared's session in
// storage, and vice versa on the next pbShared write. Whichever client saved
// last wins in storage, so a page reload can load the wrong backend's token
// into either client. pbLandnam's session is always re-derivable from
// pbShared via the exchange, so giving it its own key here is a safe,
// no-migration fix — pbShared intentionally keeps the SDK's default key so
// existing players' stored sessions keep working.
export const pbLandnam = new PocketBase(
  process.env.NEXT_PUBLIC_LANDNAM_PB_URL || 'http://localhost:8093',
  new LocalAuthStore('pocketbase_auth_landnam')
)

let exchangeInFlight: Promise<{ token: string; record: RecordModel }> | null = null
let exchangeInFlightFor: string | null = null

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
  if (exchangeInFlight && exchangeInFlightFor === sharedToken) return exchangeInFlight
  const base = (process.env.NEXT_PUBLIC_LANDNAM_PB_URL || 'http://localhost:8093').replace(/\/$/, '')
  exchangeInFlightFor = sharedToken
  exchangeInFlight = fetch(`${base}/api/landnam-auth/exchange`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${sharedToken}` },
  }).then(res => {
    if (!res.ok) {
      throw new Error(`landnam-auth exchange failed: ${res.status}`)
    }
    return res.json()
  }).finally(() => {
    exchangeInFlight = null
    exchangeInFlightFor = null
  })
  return exchangeInFlight
}
