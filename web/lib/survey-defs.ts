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

export const SURVEY_DEFS: Record<string, Survey> = {
  lnm_first_launch: {
    id: '019e5a4e-46ab-0000-df9e-81f0e919a252',
    name: '[Landnam / Launch] First Launch Feel',
    posthogUrl: 'https://us.posthog.com/project/199773/surveys/019e5a4e-46ab-0000-df9e-81f0e919a252',
    questions: [
      { id: 'c1458f2b-1205-406b-89a6-e7b1c6c3990e', type: 'rating', question: 'How did your first launch feel?', scale: 5 },
      { id: '3dd8527e-b346-4228-9949-641fcca4dbfa', type: 'multiple_choice', question: 'What would have made the launch more exciting?', choices: ['Better visual effects', 'More build-up beforehand', 'Sound or music', 'It was already great', 'Not sure'] },
    ],
  },
  lnm_mining_feel: {
    id: '019ccaf8-c4d8-0000-901b-aa850dfd43c5',
    name: '[Landnam / Core Loop] Mining Loop Feel',
    posthogUrl: 'https://us.posthog.com/project/199773/surveys/019ccaf8-c4d8-0000-901b-aa850dfd43c5',
    questions: [
      { id: '304fa641-3648-4997-817b-a2fd939ec906', type: 'rating', question: 'How fun was that mining run?', scale: 5 },
      { id: '2b7a97f3-dabb-4ead-9a2b-8ebfb47365d2', type: 'multiple_choice', question: 'What felt off about mining?', choices: ['Too slow', 'Unclear what to collect', 'Hard to control', 'Nothing - felt good'] },
    ],
  },
  lnm_client_pick: {
    id: '019ccaf8-4299-0000-b3ad-92a57ab75b95',
    name: '[Landnam / Clients] Client First Impression',
    posthogUrl: 'https://us.posthog.com/project/199773/surveys/019ccaf8-4299-0000-b3ad-92a57ab75b95',
    questions: [
      { id: '2be9f42f-5e1f-4eb2-8a33-2c203aa228d5', type: 'multiple_choice', question: 'Why did you pick this client?', choices: ['Their resource bonuses', 'The company name', 'First one listed', 'Not sure'] },
      { id: '1df4602a-a982-4f8e-bbfe-3c1543af32b2', type: 'rating', question: 'How clear was it what signing this client would give you?', scale: 5 },
    ],
  },
  lnm_mission_friction: {
    id: '019e5a4e-6b23-0000-dbb1-0bed0fad9910',
    name: '[Landnam / Core Loop] Mission Difficulty Friction',
    posthogUrl: 'https://us.posthog.com/project/199773/surveys/019e5a4e-6b23-0000-dbb1-0bed0fad9910',
    questions: [
      { id: 'dc3d2d2a-b5d1-4486-8706-7e8a99bc1394', type: 'multiple_choice', question: 'What part of the mission was most difficult?', choices: ['Knowing where to go next', 'Mining — too hard or too slow', 'Managing my budget', 'Understanding the scanner', 'The client system', 'Nothing was too hard'] },
      { id: '5290ee4c-d52c-4dac-8b39-3e430531fdec', type: 'rating', question: 'How frustrated did you feel?', scale: 5 },
    ],
  },
  lnm_progression_feel: {
    id: '019e5a4e-5f74-0000-2470-c06526c3e36d',
    name: '[Landnam / Progression] Progression Speed Feel',
    posthogUrl: 'https://us.posthog.com/project/199773/surveys/019e5a4e-5f74-0000-2470-c06526c3e36d',
    questions: [
      { id: '48d61f92-6d4e-4683-8eec-c7ed146cfe79', type: 'multiple_choice', question: 'How does the speed of levelling up feel?', choices: ['Too slow — it feels like a grind', 'A bit slow', 'About right', 'A bit fast', 'Too fast — levels feel cheap'] },
      { id: 'ccf81db7-dd5c-430a-ae75-a58532bbd72c', type: 'rating', question: 'How satisfying was reaching this level?', scale: 5 },
    ],
  },
  lnm_end_of_content: {
    id: '019e5a4e-532f-0000-da2b-18527d4e3299',
    name: '[Landnam / Endgame] End of Content M4',
    posthogUrl: 'https://us.posthog.com/project/199773/surveys/019e5a4e-532f-0000-da2b-18527d4e3299',
    questions: [
      { id: '66066619-9456-4c0e-b03e-2e727ed16f01', type: 'rating', question: 'Overall, how would you rate your Landnám experience?', scale: 5 },
      { id: '36c5efc0-60da-4118-af26-717f3560e2e7', type: 'multiple_choice', question: 'What would keep you playing if there was more content?', choices: ['More missions and story', 'New mechanics or ships', 'Competitive or co-op play', 'Deeper planet science', 'Better rewards and progression', 'Nothing — I am done for now'] },
      { id: '71993ad5-3978-4476-aa4b-e53bdac0373c', type: 'open', question: 'Anything else you want us to know?' },
    ],
  },
  lnm_return_visit: {
    id: '019e5a4e-5958-0000-e011-fc51b26ca89d',
    name: '[Landnam / Retention] Return Visit Motivation',
    posthogUrl: 'https://us.posthog.com/project/199773/surveys/019e5a4e-5958-0000-e011-fc51b26ca89d',
    questions: [
      { id: '42c44a89-ea57-4b73-84ed-6e337c1dc1a5', type: 'multiple_choice', question: 'What brought you back to Landnám today?', choices: ['Wanted to finish a mission', 'Curious about new content', 'Habit — I just keep playing', 'Someone mentioned it', 'Boredom', 'Not sure'] },
      { id: '10781cf1-e118-4c74-b14a-18871b1238f1', type: 'rating', question: 'How strong is your urge to keep playing right now?', scale: 5 },
    ],
  },
  lnm_m1_complete: {
    id: '019f36f7-3d1d-0000-08d3-3c4d0d132f2e',
    name: '[Landnam / Onboarding] M1 Mission Feedback',
    posthogUrl: 'https://us.posthog.com/project/199773/surveys/019f36f7-3d1d-0000-08d3-3c4d0d132f2e',
    questions: [
      { id: 'm1-mission-choice', type: 'multiple_choice', question: 'How did picking a contract from a few options feel?', choices: ['Meaningful', 'Fine but simple', 'Confusing', 'I did not notice I had a choice'] },
      { id: 'm1-rating', type: 'rating', question: 'How was that mission?', scale: 5 },
      { id: 'm1-freetext', type: 'open', question: 'Anything confusing?' },
    ],
  },
  lnm_m2_complete: {
    id: '019f36f7-5cd2-0000-ab19-7335d90b1e4a',
    name: '[Landnam / Onboarding] M2 Mission Feedback',
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
    name: '[Landnam / Onboarding] M3 Graduation',
    posthogUrl: 'https://us.posthog.com/project/199773/surveys/019f36f7-9396-0000-9271-74f9bba0546a',
    questions: [
      { id: 'm3-transport-clarity', type: 'multiple_choice', question: 'How clear was it that this was a two-stop delivery job — mine, then drop cargo at a second target?', choices: ['Crystal clear', 'Mostly clear', 'A bit confusing', 'I did not realize there were two stops'] },
      { id: 'm3-client-choice', type: 'multiple_choice', question: 'How did picking between the two clients feel?', choices: ['Meaningful', 'Fine but simple', 'Confusing', 'I did not notice I had a choice'] },
      { id: 'm3-rating', type: 'rating', question: 'How are you feeling about the game after three missions?', scale: 5 },
      { id: 'm3-freetext', type: 'open', question: 'Anything we should know before you play more?' },
    ],
  },
  lnm_satellite_clarity: {
    id: '019fa559-287d-0000-b28f-4160c0f22955',
    name: '[Landnam / Satellite] Satellite Mission Clarity',
    posthogUrl: 'https://us.posthog.com/project/199773/surveys/019fa559-287d-0000-b28f-4160c0f22955',
    questions: [
      { id: '28bf15cb-fcaf-4913-b992-61207b6bff77', type: 'multiple_choice', question: 'How clear was the satellite mission loop from building the station to reviewing the downlink?', choices: ['Very clear', 'Mostly clear', 'A bit confusing', 'I did not understand what to do next'] },
    ],
  },
  lnm_resume_mission: {
    id: '019fa559-30bb-0000-1996-5ebd41f7bea6',
    name: '[Landnam / Missions] Resume In-Progress Mission',
    posthogUrl: 'https://us.posthog.com/project/199773/surveys/019fa559-30bb-0000-1996-5ebd41f7bea6',
    questions: [
      { id: '65bf16e2-f677-4f0e-a412-7e12da180762', type: 'multiple_choice', question: 'How easy was it to resume your in-progress mission after leaving Earth Base?', choices: ['Very easy', 'Mostly easy', 'A bit confusing', 'I could not find my mission'] },
    ],
  },
  lnm_base_building: {
    id: '019fa559-3772-0000-3d55-36b4b76d3334',
    name: '[Landnam / Earth Base] Base Building Feel',
    posthogUrl: 'https://us.posthog.com/project/199773/surveys/019fa559-3772-0000-3d55-36b4b76d3334',
    questions: [
      { id: 'f2421ef5-31d3-4adf-934b-d0aff3f7d774', type: 'rating', question: 'How satisfying was placing or upgrading a structure in Earth Base?', scale: 5 },
    ],
  },
  lnm_rover_clarity: {
    id: '019fa559-3f8e-0000-f464-9a988e88cd4e',
    name: '[Landnam / Rover] Rover Mining Clarity',
    posthogUrl: 'https://us.posthog.com/project/199773/surveys/019fa559-3f8e-0000-f464-9a988e88cd4e',
    questions: [
      { id: 'd41b40f8-072d-47e2-9dc3-f63c65f7863b', type: 'multiple_choice', question: 'How clear was what your rover was doing while it mined?', choices: ['Very clear', 'Mostly clear', 'A bit confusing', 'I could not tell what was happening'] },
    ],
  },
}
