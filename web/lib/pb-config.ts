// Single place resolving both PocketBase backend URLs.
//
// NEXT_PUBLIC_* values are inlined when `next build` runs. A staging Worker
// built for landnam-web-staging.liam-55d.workers.dev shipped
// http://localhost:8090 and http://localhost:8091 (SSL-439): the browser
// then refused the connection and the PocketBase SDK surfaced that as
// "Something went wrong." /api/backend-health returned 503, so the data-link
// pill never left CONNECTING / WARMING UP.
//
// Deployed builds (NEXT_PUBLIC_LANDNAM_ENV=staging|production) must not keep
// a loopback URL. Local `next dev`, the offline sandbox image, and the CI
// compile check do not set that env, so they keep talking to localhost.
// Set NEXT_PUBLIC_PB_ALLOW_LOOPBACK=1 to force loopback even on a deployed build.

const DEPLOYED_SHARED_PB_URL = 'https://signal-k-starsailors.fly.dev'
const DEPLOYED_LANDNAM_PB_URL = 'https://signal-k-landnam.fly.dev'

const DEV_SHARED_PB_URL = 'http://localhost:8090'
const DEV_LANDNAM_PB_URL = 'http://localhost:8093'

export function isLoopbackPbUrl(url: string): boolean {
  return /^https?:\/\/(localhost|127\.0\.0\.1)(:|\/|$)/.test(url)
}

export function resolvePocketBaseUrl(options: {
  configured: string | undefined
  devFallback: string
  deployed: string
  landnamEnv: string | undefined
  allowLoopback: boolean
}): string {
  const configured = options.configured?.trim() ?? ''
  const value = configured.length > 0 ? configured : options.devFallback
  const deployedBuild = options.landnamEnv === 'staging' || options.landnamEnv === 'production'
  if (deployedBuild && !options.allowLoopback && isLoopbackPbUrl(value)) {
    return options.deployed
  }
  return value
}

function readUrl(configured: string | undefined, devFallback: string, deployed: string): string {
  return resolvePocketBaseUrl({
    configured,
    devFallback,
    deployed,
    landnamEnv: process.env.NEXT_PUBLIC_LANDNAM_ENV,
    allowLoopback: process.env.NEXT_PUBLIC_PB_ALLOW_LOOPBACK === '1',
  })
}

export function sharedPbUrl(): string {
  return readUrl(process.env.NEXT_PUBLIC_SHARED_PB_URL, DEV_SHARED_PB_URL, DEPLOYED_SHARED_PB_URL)
}

export function landnamPbUrl(): string {
  return readUrl(process.env.NEXT_PUBLIC_LANDNAM_PB_URL, DEV_LANDNAM_PB_URL, DEPLOYED_LANDNAM_PB_URL)
}

function isDeployedOrigin(): boolean {
  if (typeof window === 'undefined') return false
  return !isLoopbackPbUrl(window.location.origin)
}

export function sharedBackendMisconfigured(): boolean {
  return isDeployedOrigin() && isLoopbackPbUrl(sharedPbUrl())
}

export function landnamBackendMisconfigured(): boolean {
  return isDeployedOrigin() && isLoopback(LANDNAM_PB_URL)
}
