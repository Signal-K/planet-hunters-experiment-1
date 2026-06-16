import { initPostHog, posthog } from '@/lib/posthog'

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
  questions: SurveyQuestion[]
}

export const SURVEY_DEFS: Record<string, Survey> = {
  lnm_first_launch: {
    id: '019e5a4e-46ab-0000-df9e-81f0e919a252',
    name: 'Landnám: First Launch Feel',
    questions: [
      { id: 'c1458f2b-1205-406b-89a6-e7b1c6c3990e', type: 'rating', question: 'How did your first launch feel?', scale: 5 },
      { id: '3dd8527e-b346-4228-9949-641fcca4dbfa', type: 'multiple_choice', question: 'What would have made the launch more exciting?', choices: ['Better visual effects', 'More build-up beforehand', 'Sound or music', 'It was already great', 'Not sure'] },
    ],
  },
  lnm_mining_feel: {
    id: '019ccaf8-c4d8-0000-901b-aa850dfd43c5',
    name: 'Planet Hunters: Mining Loop Feel',
    questions: [
      { id: '304fa641-3648-4997-817b-a2fd939ec906', type: 'rating', question: 'How fun was that mining run?', scale: 5 },
      { id: '2b7a97f3-dabb-4ead-9a2b-8ebfb47365d2', type: 'multiple_choice', question: 'What felt off about mining?', choices: ['Too slow', 'Unclear what to collect', 'Hard to control', 'Nothing — felt good'] },
    ],
  },
  lnm_contractor_pick: {
    id: '019ccaf8-4299-0000-b3ad-92a57ab75b95',
    name: 'Planet Hunters: Contractor First Impression',
    questions: [
      { id: '2be9f42f-5e1f-4eb2-8a33-2c203aa228d5', type: 'multiple_choice', question: 'Why did you pick this contractor?', choices: ['Their resource bonuses', 'The company name', 'First one listed', 'Not sure'] },
      { id: '1df4602a-a982-4f8e-bbfe-3c1543af32b2', type: 'rating', question: 'How clear was it what signing this contractor would give you?', scale: 5 },
    ],
  },
  lnm_mission_friction: {
    id: '019e5a4e-6b23-0000-dbb1-0bed0fad9910',
    name: 'Landnám: Mission Difficulty Friction',
    questions: [
      { id: 'dc3d2d2a-b5d1-4486-8706-7e8a99bc1394', type: 'multiple_choice', question: 'What part of the mission was most difficult?', choices: ['Knowing where to go next', 'Mining — too hard or too slow', 'Managing my budget', 'Understanding the scanner', 'The contractor system', 'Nothing was too hard'] },
      { id: '5290ee4c-d52c-4dac-8b39-3e430531fdec', type: 'rating', question: 'How frustrated did you feel?', scale: 5 },
    ],
  },
  lnm_progression_feel: {
    id: '019e5a4e-5f74-0000-2470-c06526c3e36d',
    name: 'Landnám: Progression Speed Feel',
    questions: [
      { id: '48d61f92-6d4e-4683-8eec-c7ed146cfe79', type: 'multiple_choice', question: 'How does the speed of progression feel?', choices: ['Too slow — it feels like a grind', 'A bit slow', 'About right', 'A bit fast', 'Too fast — levels feel cheap'] },
      { id: 'ccf81db7-dd5c-430a-ae75-a58532bbd72c', type: 'rating', question: 'How satisfying was completing that mission?', scale: 5 },
    ],
  },
  lnm_planet_discovery: {
    id: '019e5a4e-6528-0000-b69d-e5745079ffd5',
    name: 'Landnám: Planet Discovery Excitement',
    questions: [
      { id: 'eca91038-cef1-40df-9029-21f1be12c892', type: 'rating', question: 'How exciting was it to find your first planet candidate?', scale: 5 },
      { id: '3c06c2ed-5607-46e9-a27d-2c30e0d01758', type: 'multiple_choice', question: 'Did you know this is a real unconfirmed exoplanet candidate from TESS data?', choices: ['Yes — that is why I use the scanner', 'Yes, I had read about it', 'No — I had no idea!', 'I suspected but was not sure'] },
    ],
  },
  lnm_end_of_content: {
    id: '019e5a4e-532f-0000-da2b-18527d4e3299',
    name: 'Landnám: End of Content (M4)',
    questions: [
      { id: '66066619-9456-4c0e-b03e-2e727ed16f01', type: 'rating', question: 'Overall, how would you rate your Landnám experience?', scale: 5 },
      { id: '36c5efc0-60da-4118-af26-717f3560e2e7', type: 'multiple_choice', question: 'What would keep you playing if there was more content?', choices: ['More missions and story', 'New mechanics or ships', 'Competitive or co-op play', 'Deeper planet science', 'Better rewards and progression', 'Nothing — I am done for now'] },
      { id: '71993ad5-3978-4476-aa4b-e53bdac0373c', type: 'open', question: 'Anything else you want us to know?' },
    ],
  },
  lnm_return_visit: {
    id: '019e5a4e-5958-0000-e011-fc51b26ca89d',
    name: 'Landnám: Return Visit Motivation',
    questions: [
      { id: '42c44a89-ea57-4b73-84ed-6e337c1dc1a5', type: 'multiple_choice', question: 'What brought you back to Landnám today?', choices: ['Wanted to finish a mission', 'Curious about new content', 'Habit — I just keep playing', 'Someone mentioned it', 'Boredom', 'Not sure'] },
      { id: '10781cf1-e118-4c74-b14a-18871b1238f1', type: 'rating', question: 'How strong is your urge to keep playing right now?', scale: 5 },
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

export function enqueueSurvey(surveyKey: string, delayMs = 1800) {
  if (typeof window === 'undefined') return
  const def = SURVEY_DEFS[surveyKey]
  if (!def) return
  if (getShownSurveys().has(surveyKey)) return
  markSurveyShown(surveyKey)
  setTimeout(() => {
    window.dispatchEvent(new CustomEvent('landnam:survey', { detail: { surveyKey } }))
  }, delayMs)
}

export function submitSurveyResponse(surveyKey: string, responses: Record<string, string | number>) {
  const def = SURVEY_DEFS[surveyKey]
  if (!def) return
  initPostHog()
  const payload: Record<string, string | number> = {
    $survey_id: def.id,
    $survey_name: def.name,
  }
  for (const [qId, value] of Object.entries(responses)) {
    payload[`$survey_response_${qId}`] = value
  }
  posthog.capture('survey sent', payload)
}

export function trackSurveyShown(surveyKey: string) {
  const def = SURVEY_DEFS[surveyKey]
  if (!def) return
  initPostHog()
  posthog.capture('survey shown', { $survey_id: def.id, $survey_name: def.name })
}
