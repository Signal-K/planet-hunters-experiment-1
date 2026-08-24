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
    // it's off here and screen changes are captured manually instead (see
    // captureScreenView below, called from GameApp).
    capture_pageview: false,
    // Autocapture unhandled JS errors/promise rejections as PostHog
    // exception events — the game has a lot of offline/cold-start retry
    // paths (PocketBase sync, push scheduling); knowing what actually
    // throws for real players is otherwise invisible.
    capture_exceptions: true,
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
  initialised = true
}

// Fires a virtual pageview for the given in-game screen. The SPA never
// changes `window.location`, so PostHog's own pageview capture (disabled
// above) would otherwise see a single URL for the entire session — Paths/
// Trends/Funnels need this to tell screens apart.
export function captureScreenView(screen: string) {
  if (typeof window === 'undefined') return
  initPostHog()
  posthog.capture('$pageview', {
    $current_url: `${window.location.origin}/game/${screen}`,
    screen,
  })
}

export function identifyUser(userId: string, props?: Record<string, string>) {
  if (typeof window === 'undefined') return
  initPostHog()
  posthog.identify(userId, props)
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

export { posthog }
