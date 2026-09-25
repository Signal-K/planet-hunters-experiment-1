// Single place resolving both PocketBase backend URLs, so a deployed build
// pointing at a loopback backend (SSL-9: build-time env vars missing from a
// deploy target) can be told apart from a genuine, transient fetch failure.
// A misconfigured build is a dead end no retry will fix; only report it when
// a real deployed origin is still wired to localhost.

const SHARED_PB_URL = process.env.NEXT_PUBLIC_SHARED_PB_URL || 'http://localhost:8090'
const LANDNAM_PB_URL = process.env.NEXT_PUBLIC_LANDNAM_PB_URL || 'http://localhost:8093'

function isLoopback(url: string): boolean {
  return /^https?:\/\/(localhost|127\.0\.0\.1)(:|\/|$)/.test(url)
}

function isDeployedOrigin(): boolean {
  if (typeof window === 'undefined') return false
  return !isLoopback(window.location.origin)
}

export function sharedPbUrl(): string {
  return SHARED_PB_URL
}

export function landnamPbUrl(): string {
  return LANDNAM_PB_URL
}

export function sharedBackendMisconfigured(): boolean {
  return isDeployedOrigin() && isLoopback(SHARED_PB_URL)
}

export function landnamBackendMisconfigured(): boolean {
  return isDeployedOrigin() && isLoopback(LANDNAM_PB_URL)
}
