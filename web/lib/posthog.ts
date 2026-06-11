import posthog from 'posthog-js'

let initialised = false

export function initPostHog() {
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY
  if (!key || initialised || typeof window === 'undefined') return
  posthog.init(key, {
    api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST ?? 'https://us.i.posthog.com',
    person_profiles: 'identified_only',
    capture_pageview: false,
  })
  initialised = true
}

export function openFeedbackSurvey() {
  const surveyId = process.env.NEXT_PUBLIC_POSTHOG_SURVEY_ID
  if (!surveyId || typeof window === 'undefined') return
  initPostHog()
  posthog.capture('survey shown', { $survey_id: surveyId })
}

export { posthog }
