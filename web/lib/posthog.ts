import posthog from 'posthog-js'

let initialised = false

export function initPostHog() {
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY
  if (!key || initialised || typeof window === 'undefined') return
  posthog.init(key, {
    api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST ?? 'https://us.i.posthog.com',
    person_profiles: 'always',
    capture_pageview: false,
  })
  initialised = true
}

export function identifyUser(userId: string, props?: Record<string, string>) {
  if (typeof window === 'undefined') return
  initPostHog()
  posthog.identify(userId, props)
}

export { posthog }
