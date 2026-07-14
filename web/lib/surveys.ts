import { initPostHog, posthog } from '@/lib/posthog'
import { pbShared } from '@/lib/pb'
import { pbLandnam } from '@/lib/pb-landnam'

export type SurveyQuestionType = 'rating' | 'multiple_choice' | 'open'

export interface SurveyQuestion {
  id: string
  type: SurveyQuestionType
  question: string
  choices?: string[]
  scale?: number
}

export interface Survey {
  id: string
  name: string
  posthogUrl?: string
  questions: SurveyQuestion[]
}

type SurveyResponseValue = string | number
type SurveyResponses = Record<string, SurveyResponseValue>

export const SURVEY_DEFS: Record<string, Survey> = {
  lnm_first_launch: {
    id: '019e5a4e-46ab-0000-df9e-81f0e919a252',
    name: 'Landnám: First Launch Feel',
    posthogUrl: 'https://us.posthog.com/project/199773/surveys/019e5a4e-46ab-0000-df9e-81f0e919a252',
    questions: [
      { id: 'c1458f2b-1205-406b-89a6-e7b1c6c3990e', type: 'rating', question: 'How did your first launch feel?', scale: 5 },
      { id: '3dd8527e-b346-4228-9949-641fcca4dbfa', type: 'multiple_choice', question: 'What would have made the launch more exciting?', choices: ['Better visual effects', 'More build-up beforehand', 'Sound or music', 'It was already great', 'Not sure'] },
    ],
  },
  lnm_mining_feel: {
    id: '019ccaf8-c4d8-0000-901b-aa850dfd43c5',
    name: 'Planet Hunters: Mining Loop Feel',
    posthogUrl: 'https://us.posthog.com/project/199773/surveys/019ccaf8-c4d8-0000-901b-aa850dfd43c5',
    questions: [
      { id: '304fa641-3648-4997-817b-a2fd939ec906', type: 'rating', question: 'How fun was that mining run?', scale: 5 },
      { id: '2b7a97f3-dabb-4ead-9a2b-8ebfb47365d2', type: 'multiple_choice', question: 'What felt off about mining?', choices: ['Too slow', 'Unclear what to collect', 'Hard to control', 'Nothing - felt good'] },
    ],
  },
  lnm_contractor_pick: {
    id: '019ccaf8-4299-0000-b3ad-92a57ab75b95',
    name: 'Planet Hunters: Contractor First Impression',
    posthogUrl: 'https://us.posthog.com/project/199773/surveys/019ccaf8-4299-0000-b3ad-92a57ab75b95',
    questions: [
      { id: '2be9f42f-5e1f-4eb2-8a33-2c203aa228d5', type: 'multiple_choice', question: 'Why did you pick this client?', choices: ['Their resource bonuses', 'The company name', 'First one listed', 'Not sure'] },
      { id: '1df4602a-a982-4f8e-bbfe-3c1543af32b2', type: 'rating', question: 'How clear was it what signing this client would give you?', scale: 5 },
    ],
  },
  lnm_mission_friction: {
    id: '019e5a4e-6b23-0000-dbb1-0bed0fad9910',
    name: 'Landnám: Mission Difficulty Friction',
    posthogUrl: 'https://us.posthog.com/project/199773/surveys/019e5a4e-6b23-0000-dbb1-0bed0fad9910',
    questions: [
      { id: 'dc3d2d2a-b5d1-4486-8706-7e8a99bc1394', type: 'multiple_choice', question: 'What part of the mission was most difficult?', choices: ['Knowing where to go next', 'Mining — too hard or too slow', 'Managing my budget', 'Understanding the scanner', 'The client system', 'Nothing was too hard'] },
      { id: '5290ee4c-d52c-4dac-8b39-3e430531fdec', type: 'rating', question: 'How frustrated did you feel?', scale: 5 },
    ],
  },
  lnm_progression_feel: {
    id: '019e5a4e-5f74-0000-2470-c06526c3e36d',
    name: 'Landnám: Progression Speed Feel',
    posthogUrl: 'https://us.posthog.com/project/199773/surveys/019e5a4e-5f74-0000-2470-c06526c3e36d',
    questions: [
      { id: '48d61f92-6d4e-4683-8eec-c7ed146cfe79', type: 'multiple_choice', question: 'How does the speed of levelling up feel?', choices: ['Too slow — it feels like a grind', 'A bit slow', 'About right', 'A bit fast', 'Too fast — levels feel cheap'] },
      { id: 'ccf81db7-dd5c-430a-ae75-a58532bbd72c', type: 'rating', question: 'How satisfying was reaching this level?', scale: 5 },
    ],
  },
  lnm_end_of_content: {
    id: '019e5a4e-532f-0000-da2b-18527d4e3299',
    name: 'Landnám: End of Content (M4)',
    posthogUrl: 'https://us.posthog.com/project/199773/surveys/019e5a4e-532f-0000-da2b-18527d4e3299',
    questions: [
      { id: '66066619-9456-4c0e-b03e-2e727ed16f01', type: 'rating', question: 'Overall, how would you rate your Landnám experience?', scale: 5 },
      { id: '36c5efc0-60da-4118-af26-717f3560e2e7', type: 'multiple_choice', question: 'What would keep you playing if there was more content?', choices: ['More missions and story', 'New mechanics or ships', 'Competitive or co-op play', 'Deeper planet science', 'Better rewards and progression', 'Nothing — I am done for now'] },
      { id: '71993ad5-3978-4476-aa4b-e53bdac0373c', type: 'open', question: 'Anything else you want us to know?' },
    ],
  },
  lnm_return_visit: {
    id: '019e5a4e-5958-0000-e011-fc51b26ca89d',
    name: 'Landnám: Return Visit Motivation',
    posthogUrl: 'https://us.posthog.com/project/199773/surveys/019e5a4e-5958-0000-e011-fc51b26ca89d',
    questions: [
      { id: '42c44a89-ea57-4b73-84ed-6e337c1dc1a5', type: 'multiple_choice', question: 'What brought you back to Landnám today?', choices: ['Wanted to finish a mission', 'Curious about new content', 'Habit — I just keep playing', 'Someone mentioned it', 'Boredom', 'Not sure'] },
      { id: '10781cf1-e118-4c74-b14a-18871b1238f1', type: 'rating', question: 'How strong is your urge to keep playing right now?', scale: 5 },
    ],
  },
  lnm_m1_complete: {
    id: '019f36f7-3d1d-0000-08d3-3c4d0d132f2e',
    name: 'Landnám: M1 Mission Feedback',
    posthogUrl: 'https://us.posthog.com/project/199773/surveys/019f36f7-3d1d-0000-08d3-3c4d0d132f2e',
    questions: [
      { id: 'm1-mission-choice', type: 'multiple_choice', question: 'How did picking a contract from a few options feel?', choices: ['Meaningful', 'Fine but simple', 'Confusing', 'I did not notice I had a choice'] },
      { id: 'm1-rating', type: 'rating', question: 'How was that mission?', scale: 5 },
      { id: 'm1-freetext', type: 'open', question: 'Anything confusing?' },
    ],
  },
  lnm_m2_complete: {
    id: '019f36f7-5cd2-0000-ab19-7335d90b1e4a',
    name: 'Landnám: M2 Mission Feedback',
    posthogUrl: 'https://us.posthog.com/project/199773/surveys/019f36f7-5cd2-0000-ab19-7335d90b1e4a',
    questions: [
      { id: 'm2-mission-choice', type: 'multiple_choice', question: 'How did picking a contract from a few options feel?', choices: ['Meaningful', 'Fine but simple', 'Confusing', 'I did not notice I had a choice'] },
      { id: 'm2-rocket-clarity', type: 'multiple_choice', question: 'How clear was the Prospector purchase step?', choices: ['Totally clear', 'A bit confusing', 'I wasn\'t sure why I needed a new rocket', 'I missed it at first'] },
      { id: 'm2-rating', type: 'rating', question: 'How satisfying was completing that mission?', scale: 5 },
      { id: 'm2-freetext', type: 'open', question: 'Anything that slowed you down?' },
    ],
  },
  lnm_m3_complete: {
    id: '019f36f7-9396-0000-9271-74f9bba0546a',
    name: 'Landnám: M3 Onboarding Graduation',
    posthogUrl: 'https://us.posthog.com/project/199773/surveys/019f36f7-9396-0000-9271-74f9bba0546a',
    // M3 changed from a contractor-free self-directed mining run to a
    // two-leg contractor transport job (pick between two contractors, mine
    // at a preset pickup target, deliver to a preset second target) — see
    // [[Decide: M3 becomes a transport mission]]. Live PostHog survey
    // definition at posthogUrl updated to match (2026-07-10).
    questions: [
      { id: 'm3-transport-clarity', type: 'multiple_choice', question: 'How clear was it that this was a two-stop delivery job — mine, then drop cargo at a second target?', choices: ['Crystal clear', 'Mostly clear', 'A bit confusing', 'I did not realize there were two stops'] },
      { id: 'm3-contractor-choice', type: 'multiple_choice', question: 'How did picking between the two clients feel?', choices: ['Meaningful', 'Fine but simple', 'Confusing', 'I did not notice I had a choice'] },
      { id: 'm3-rating', type: 'rating', question: 'How are you feeling about the game after three missions?', scale: 5 },
      { id: 'm3-freetext', type: 'open', question: 'Anything we should know before you play more?' },
    ],
  },
}

const SHOWN_STORAGE_KEY = 'landnam-surveys-shown'

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
// M2's contractor-pick all landing within a few seconds of each other) —
// without a real gap they'd stack into a rapid-fire interrogation the moment
// the player reaches a quiet screen. This spaces them out instead.
const NEXT_SURVEY_GAP_MS = 60_000

export function onSurveyDismissed() {
  queueDispatching = false
  setTimeout(tryDispatch, NEXT_SURVEY_GAP_MS)
}

export function enqueueSurvey(surveyKey: string, delayMs = 1800) {
  if (typeof window === 'undefined') return
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
  const def = SURVEY_DEFS[surveyKey]
  if (!def) return
  initPostHog()
  posthog.capture('survey shown', { $survey_id: def.id, $survey_name: def.name })
}
