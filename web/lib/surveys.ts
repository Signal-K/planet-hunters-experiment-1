import { initPostHog, posthog } from '@/lib/posthog'
import { pbShared } from '@/lib/pb'
import { pbLandnam } from '@/lib/pb-landnam'
import { SURVEY_DEFS, type Survey, type SurveyQuestion } from '@/lib/survey-defs'

export { SURVEY_DEFS, type Survey, type SurveyQuestion } from '@/lib/survey-defs'

type SurveyResponseValue = string | number
type SurveyResponses = Record<string, SurveyResponseValue>

const SHOWN_STORAGE_KEY = 'landnam-surveys-shown'

type CypressRuntime = { env: (key: string) => unknown }
type SurveyWindow = Window & { Cypress?: CypressRuntime }

export function isSurveyRuntimeEnabled(): boolean {
  if (process.env.NODE_ENV === 'production') return true
  if (typeof window === 'undefined') return false
  return (window as SurveyWindow).Cypress?.env('allowSurveys') === true
}

function getShownSurveys(): Set<string> {
  if (typeof window === 'undefined') return new Set()
  try {
    const raw = localStorage.getItem(SHOWN_STORAGE_KEY)
    return new Set(raw ? JSON.parse(raw) : [])
  } catch {
    return new Set()
  }
}

function markSurveyShown(surveyKey: string) {
  if (typeof window === 'undefined') return
  const shown = getShownSurveys()
  shown.add(surveyKey)
  localStorage.setItem(SHOWN_STORAGE_KEY, JSON.stringify([...shown]))
}

const surveyQueue: string[] = []
let queueDispatching = false

function tryDispatch() {
  if (queueDispatching || surveyQueue.length === 0) return
  const key = surveyQueue.shift()!
  queueDispatching = true
  window.dispatchEvent(new CustomEvent('landnam:survey', { detail: { surveyKey: key } }))
}

// Gap before the next queued survey is allowed to appear. Several surveys
// can legitimately queue back-to-back (e.g. M1-complete + progression-feel +
// M2's client-pick all landing within a few seconds of each other) —
// without a real gap they'd stack into a rapid-fire interrogation the moment
// the player reaches a quiet screen. This spaces them out instead.
const NEXT_SURVEY_GAP_MS = 60_000

export function onSurveyDismissed() {
  queueDispatching = false
  setTimeout(tryDispatch, NEXT_SURVEY_GAP_MS)
}

export function enqueueSurvey(surveyKey: string, delayMs = 1800) {
  if (!isSurveyRuntimeEnabled()) return
  const def = SURVEY_DEFS[surveyKey]
  if (!def) return
  if (getShownSurveys().has(surveyKey)) return
  markSurveyShown(surveyKey)
  surveyQueue.push(surveyKey)
  setTimeout(tryDispatch, delayMs)
}

const ONBOARDING_MISSION_ID: Record<string, string> = {
  lnm_m1_complete: 'm1',
  lnm_m2_complete: 'm2',
  lnm_m3_complete: 'm3',
  lnm_end_of_content: 'end_of_content',
}

function storeSurveyInPb(missionId: string, responses: SurveyResponses, dismissed: boolean) {
  if (typeof window === 'undefined') return
  const userId = pbShared.authStore.record?.id ?? null
  const ratingVal = Object.values(responses).find(v => typeof v === 'number')
  const textVals = Object.values(responses).filter(v => typeof v === 'string')
  const freetext = textVals.find(v => (v as string).length > 10) ?? null
  const optionChoice = textVals.find(v => (v as string).length <= 80) ?? null
  pbLandnam.collection('onboarding_feedback').create({
    user_id: userId ?? '',
    mission_id: missionId,
    rating: ratingVal ?? null,
    freetext: freetext ?? null,
    option_choice: optionChoice ?? null,
    dismissed,
  }).catch(() => {/* non-critical — PostHog is source of truth */})
}

function createSurveySubmissionId(surveyId: string) {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  return `${surveyId}-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

export function buildPostHogSurveyPayload(def: Survey, responses: SurveyResponses) {
  const responsePayload: Record<string, SurveyResponseValue> = {}
  const questions = def.questions.map((q, i) => {
    const value = responses[q.id]
    if (value != null) {
      responsePayload[`$survey_response_${q.id}`] = value
      responsePayload[i === 0 ? '$survey_response' : `$survey_response_${i}`] = value
    }
    return {
      id: q.id,
      question: q.question,
      response: value,
    }
  })

  return {
    $survey_id: def.id,
    $survey_name: def.name,
    $survey_completed: true,
    $survey_submission_id: createSurveySubmissionId(def.id),
    $survey_questions: questions,
    ...responsePayload,
  }
}

export function submitSurveyResponse(surveyKey: string, responses: SurveyResponses) {
  const def = SURVEY_DEFS[surveyKey]
  if (!def) return
  initPostHog()
  const payload = buildPostHogSurveyPayload(def, responses)
  const fallbackCapture = () => posthog.capture('survey sent', payload)

  fetch('/api/surveys', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ payload, distinctId: posthog.get_distinct_id?.() }),
    keepalive: true,
  }).then(response => {
    if (!response.ok) fallbackCapture()
  }).catch(fallbackCapture)

  const missionId = ONBOARDING_MISSION_ID[surveyKey]
  if (missionId) {
    storeSurveyInPb(missionId, responses, false)
    const values = Object.values(responses)
    const rating = (values.find(v => typeof v === 'number') as number | undefined) ?? null
    const textVals = values.filter((v): v is string => typeof v === 'string')
    const freetext = textVals.find(v => v.length > 80) ?? null
    const choice = textVals.find(v => v.length <= 80) ?? null
    fetch('/api/milestone-feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        surveyKey,
        surveyName: def.name,
        milestone: missionId,
        rating,
        choice,
        freetext,
        userId: pbShared.authStore.record?.id ?? null,
      }),
    }).catch(() => {})
  }
}

export function trackSurveyShown(surveyKey: string) {
  if (!isSurveyRuntimeEnabled()) return
  const def = SURVEY_DEFS[surveyKey]
  if (!def) return
  initPostHog()
  posthog.capture('survey shown', { $survey_id: def.id, $survey_name: def.name })
}
