import posthog from 'posthog-js'

let initialised = false

export function initPostHog() {
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY
  if (!key || initialised || typeof window === 'undefined') return
  posthog.init(key, {
    api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST ?? 'https://us.i.posthog.com',
    person_profiles: 'always',
    // The app is a single-page SPA (app/game/page.tsx) that swaps an
    // internal `screen` value instead of navigating — the default
    // history-based pageview capture never fires past the initial load, so
    // it's off here. The live (main) shell captures one `$pageview` per
    // screen change through captureScreenView() instead (SSL-351).
    capture_pageview: false,
    // Dead clicks (a click that changes nothing on the page) are one of the
    // SSL-351 confusion signals, alongside $rageclick.
    capture_dead_clicks: true,
    // Autocapture unhandled JS errors/promise rejections as PostHog
    // exception events — the game has a lot of offline/cold-start retry
    // paths (PocketBase sync, push scheduling); knowing what actually
    // throws for real players is otherwise invisible.
    capture_exceptions: true,
    // Click/mousemove heatmaps for every routed screen. Screens with no
    // dedicated survey or captureGameEvent (Refinery, Market, Hangar,
    // Skills, Fab, mission history, narrative ledger, galaxy/target picker
    // — see the 2026-09-11 instrumentation coverage audit) get a passive
    // usage signal this way instead of adding more popovers.
    capture_heatmaps: true,
    // Session replay complements the qualitative surveys (mining feel,
    // launch feel, mission friction) by letting the team watch the actual
    // friction instead of only reading a rating. Mask all text inputs by
    // default since survey free-text and auth fields render as ordinary
    // inputs — nothing player-typed should end up in a recording.
    //
    // KES-233: rrweb's continuous mutation observation + periodic snapshot
    // flush (every ~9s, confirmed via network trace against the live preview)
    // was running on 100% of sessions with no sampling, and kept the main
    // thread busy enough that requestIdleCallback never got a clean window
    // after a click — the actual cause of "panels take a second to
    // register a click" on every screen, not just canvas-heavy ones.
    // Sampling keeps replay coverage for triage while cutting that
    // always-on background cost for the other 4 in 5 sessions.
    session_recording: {
      maskAllInputs: true,
      sampleRate: 0.2,
    },
  })
  // SSL-357: every Landnam event carries the app and deploy environment, so
  // staging/preview/dev traffic can be split from production players.
  posthog.register({ app: 'landnam', app_env: appEnv() })
  initialised = true
}

type AppEnv = 'prod' | 'staging' | 'preview' | 'dev'

function appEnv(): AppEnv {
  const deployEnv = process.env.NEXT_PUBLIC_LANDNAM_ENV ?? process.env.NEXT_PUBLIC_DEPLOY_ENV
  if (deployEnv === 'production' || deployEnv === 'prod') return 'prod'
  if (deployEnv === 'staging' || deployEnv === 'staged') return 'staging'
  if (deployEnv === 'preview') return 'preview'
  if (deployEnv === 'development' || deployEnv === 'dev') return 'dev'
  if (process.env.NODE_ENV !== 'production') return 'dev'
  if (typeof window === 'undefined') return 'prod'
  const host = window.location.hostname
  if (host === 'playlandnam.space' || host === 'www.playlandnam.space') return 'prod'
  if (host === 'localhost' || host === '127.0.0.1') return 'dev'
  if (host.includes('staging')) return 'staging'
  return 'preview'
}

export interface IdentifyRecord {
  id: string
  email?: string
  username?: string
}

// Auto-created guest accounts used `guest_<random>` usernames and
// `@landnam.guest` addresses; they are no longer created, but old sessions
// still restore them.
function isGuestRecord(record: IdentifyRecord): boolean {
  return !!(record.email?.toLowerCase().endsWith('@landnam.guest')
    || record.username?.startsWith('guest_')
    || record.id.startsWith('guest_'))
}

/**
 * SSL-357: identify only a live shared-PocketBase session. The caller passes
 * `sessionValid` (pbShared.authStore.isValid) so an expired guest record
 * restored from localStorage never becomes the device's person. If PostHog is
 * already identified as someone else on this device, reset first so the new
 * account starts as a clean person and no events leak across.
 */
export function identifyUser(record: IdentifyRecord | null | undefined, sessionValid: boolean) {
  if (typeof window === 'undefined' || !record?.id || !sessionValid) return
  initPostHog()
  // No key (local dev, Cypress): the client was never initialised and has no
  // persistence to read identity from.
  if (!initialised) return
  if (posthog._isIdentified() && posthog.get_distinct_id() !== record.id) posthog.reset()
  posthog.identify(record.id, {
    ...(record.email ? { email: record.email } : {}),
    pb_user_id: record.id,
    is_guest: isGuestRecord(record),
  })
  posthog.register({ app: 'landnam', app_env: appEnv() })
}

/** SSL-357: sign-out ends the PostHog person on this device. */
export function resetAnalyticsIdentity() {
  if (typeof window === 'undefined') return
  initPostHog()
  if (!initialised) return
  posthog.reset()
  posthog.register({ app: 'landnam', app_env: appEnv() })
}

/**
 * SSL-351: the live shell swaps `screen` without navigating, so it reports
 * each screen as a `$pageview` itself. `path` is the route the shell syncs
 * the URL to, which may not have been pushed yet when the screen changes.
 */
export function captureScreenView(screen: string, path: string) {
  if (typeof window === 'undefined') return
  initPostHog()
  posthog.capture('$pageview', {
    $current_url: `${window.location.origin}${path}`,
    $pathname: path,
    screen,
  })
}

// Milestone/checkpoint analytics events, separate from the survey system.
// Surveys are now sampled per player (see lib/surveys.ts) so most players
// stop seeing a popup after their first mission — this keeps every
// player's progress fully visible in Trends/Funnels regardless of whether
// they were also shown a survey at that checkpoint.
export function captureGameEvent(name: string, props?: Record<string, unknown>) {
  if (typeof window === 'undefined') return
  initPostHog()
  posthog.capture(name, props)
}

/**
 * SSL-357: survey answers are captured from the browser, not forwarded by a
 * server route, so they keep the player's `$session_id`, `$current_url`,
 * `$host` and geo instead of the server's. Sent immediately rather than
 * batched: a survey is often the last thing before the player closes the tab.
 */
export function captureSurveySent(payload: Record<string, unknown>) {
  if (typeof window === 'undefined') return
  initPostHog()
  posthog.capture('survey sent', payload, { send_instantly: true })
  window.dispatchEvent(new CustomEvent('landnam:survey-sent', { detail: payload }))
}

export { posthog }
