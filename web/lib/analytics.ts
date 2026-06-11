'use client'

import posthog from 'posthog-js'
import type { Survey, SurveyResponseValue } from 'posthog-js'

let enabled = false

export function initAnalytics() {
  if (typeof window === 'undefined' || enabled) return
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY
  if (!key) return
  posthog.init(key, {
    api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST ?? 'https://us.i.posthog.com',
    person_profiles: 'identified_only',
    capture_pageview: false,
  })
  enabled = true
}

export function isAnalyticsEnabled() {
  return enabled
}

export function track(event: string, properties?: Record<string, unknown>) {
  if (!enabled) return
  posthog.capture(event, properties)
}

/**
 * "External survey" type surveys are rendered with our own UI rather than PostHog's
 * popover, so we only surface short ones (<=2 questions) that fit the in-game flow.
 */
export function getFeedbackSurvey(callback: (survey: Survey | null) => void) {
  if (!enabled) {
    callback(null)
    return
  }
  posthog.getActiveMatchingSurveys(surveys => {
    const match = surveys.find(s => s.type === 'external_survey' && s.questions.length > 0 && s.questions.length <= 2)
    callback(match ?? null)
  })
}

export function surveyResponseKey(index: number) {
  return index === 0 ? '$survey_response' : `$survey_response_${index}`
}

export function trackSurveyShown(survey: Survey) {
  track('survey shown', {
    $survey_id: survey.id,
    $survey_name: survey.name,
  })
}

export function trackSurveySent(survey: Survey, responses: Record<string, SurveyResponseValue>, completed: boolean) {
  track('survey sent', {
    $survey_id: survey.id,
    $survey_name: survey.name,
    $survey_questions: survey.questions.map(q => ({ id: q.id, question: q.question })),
    $survey_completed: completed,
    ...responses,
  })
}

export function trackSurveyDismissed(survey: Survey) {
  track('survey dismissed', {
    $survey_id: survey.id,
    $survey_name: survey.name,
  })
}
