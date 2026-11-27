import PocketBase, { LocalAuthStore, type RecordModel } from 'pocketbase'
import { pbShared } from '@/lib/pb'
import { landnamPbUrl } from '@/lib/pb-config'

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
  landnamPbUrl(),
  new LocalAuthStore('pocketbase_auth_landnam')
)

let exchangeInFlight: Promise<{ token: string; record: RecordModel }> | null = null
let exchangeInFlightFor: string | null = null
let refreshInFlight: Promise<boolean> | null = null

export async function exchangeLandnamAuth(sharedToken: string): Promise<{
  token: string
  record: RecordModel
}> {
  if (exchangeInFlight && exchangeInFlightFor === sharedToken) return exchangeInFlight
  const base = landnamPbUrl().replace(/\/$/, '')
  exchangeInFlightFor = sharedToken
  exchangeInFlight = fetchWithWakeRetry(`${base}/api/landnam-auth/exchange`, {
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

/**
 * Recover a Landnam session once after a protected write receives 401/403.
 * The Landnam token is minted from the shared session, so renewing the shared
 * token and exchanging it is the only refresh that keeps both identities in
 * sync. The promise is shared so a burst of queued writes performs one
 * refresh, then each write gets its single retry with the new token.
 */
export function refreshLandnamAuthOnce(): Promise<boolean> {
  if (refreshInFlight) return refreshInFlight
  refreshInFlight = (async () => {
    if (!pbShared.authStore.token) return false
    await pbShared.collection('users').authRefresh()
    const sharedToken = pbShared.authStore.token
    if (!sharedToken) return false
    const { token, record } = await exchangeLandnamAuth(sharedToken)
    pbLandnam.authStore.save(token, record)
    return true
  })().catch(() => false).finally(() => {
    refreshInFlight = null
  })
  return refreshInFlight
}

/**
 * The PocketBase machine on Fly stops when idle and takes a few seconds to
 * wake. A request during the wake can fail at the network level or return
 * 502/503/504, which is not a rejected login. Retry those with backoff so a
 * cold start never looks like an auth failure. 4xx answers are returned as-is.
 */
async function fetchWithWakeRetry(url: string, init: RequestInit, attempts = 5): Promise<Response> {
  let lastError: unknown
  for (let i = 0; i < attempts; i++) {
    try {
      const res = await fetch(url, init)
      if (![502, 503, 504].includes(res.status)) return res
      lastError = new Error(`HTTP ${res.status}`)
    } catch (err) {
      lastError = err
    }
    await new Promise(resolve => setTimeout(resolve, 600 * 2 ** i))
  }
  throw lastError instanceof Error ? lastError : new Error('server did not wake')
}
