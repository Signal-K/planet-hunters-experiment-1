// Backend URL resolution shared by both PocketBase clients.
//
// `NEXT_PUBLIC_*` values are inlined at build time (Next.js convention), so a
// deploy built without them ships a bundle that points every player's browser
// at *their own machine* — `http://localhost:8090`. That fails instantly and
// identically for every backend call, which is exactly how it surfaced in
// production (KES-357): a persistent "NOT SYNCED" badge plus the Transit
// Telescope's "Live Feed Unavailable" gate, on a device whose stored session
// (read from localStorage, no round trip) still looked signed in.
//
// The localhost defaults have to stay — they are what `npm run dev` and the
// offline compose profiles rely on — but a *deployed* build reaching for
// localhost is never a transient outage, so it must not be reported as one.

const SHARED_FALLBACK = 'http://localhost:8090'
const LANDNAM_FALLBACK = 'http://localhost:8093'

export const SHARED_PB_URL = process.env.NEXT_PUBLIC_SHARED_PB_URL || SHARED_FALLBACK
export const LANDNAM_PB_URL = process.env.NEXT_PUBLIC_LANDNAM_PB_URL || LANDNAM_FALLBACK

function isLoopback(url: string): boolean {
  try {
    const { hostname } = new URL(url)
    return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '[::1]' || hostname === '::1'
  } catch {
    return false
  }
}

/**
 * True when this build is being served from a real origin but its backend URL
 * still points at the developer-machine default — i.e. the deployment is
 * missing its `NEXT_PUBLIC_*` build-time configuration and no amount of
 * retrying or waiting will fix it.
 *
 * Always false during SSR (there is no page origin to compare against) and
 * false for genuine local development, where loopback is correct.
 */
function misconfiguredForOrigin(url: string): boolean {
  if (typeof window === 'undefined') return false
  if (!isLoopback(url)) return false
  return !isLoopback(window.location.origin)
}

export function sharedBackendMisconfigured(): boolean {
  return misconfiguredForOrigin(SHARED_PB_URL)
}

export function landnamBackendMisconfigured(): boolean {
  return misconfiguredForOrigin(LANDNAM_PB_URL)
}
