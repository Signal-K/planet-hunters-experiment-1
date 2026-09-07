import { describe, expect, it, vi } from 'vitest'
import { buildPostHogSurveyPayload, getMilestoneSurveyVariant, isRepeatSurveyEligible, isSurveyRuntimeEnabled, SURVEY_DEFS } from './surveys'

describe('survey runtime gate', () => {
  it('is disabled in a normal non-production browser context', () => {
    expect(isSurveyRuntimeEnabled()).toBe(false)
  })

  it('requires the explicit Cypress survey opt-in outside production', () => {
    vi.stubGlobal('window', { Cypress: { env: vi.fn().mockReturnValue(true) } })
    expect(isSurveyRuntimeEnabled()).toBe(true)
    vi.unstubAllGlobals()
  })
})

describe('buildPostHogSurveyPayload', () => {
  it('uses real PostHog survey records for tutorial completion surveys', () => {
    expect(SURVEY_DEFS.lnm_m1_complete).toMatchObject({
      id: '019f36f7-3d1d-0000-08d3-3c4d0d132f2e',
      posthogUrl: 'https://us.posthog.com/project/199773/surveys/019f36f7-3d1d-0000-08d3-3c4d0d132f2e',
    })
    expect(SURVEY_DEFS.lnm_m2_mission_choice).toMatchObject({
      id: '01a04132-ecf7-0000-6fd8-14eec14d4fa0',
      posthogUrl: 'https://us.posthog.com/project/199773/surveys/01a04132-ecf7-0000-6fd8-14eec14d4fa0',
    })
    expect(SURVEY_DEFS.lnm_m3_transport_clarity).toMatchObject({
      id: '01a04133-c454-0000-ab38-aabdb839e333',
      posthogUrl: 'https://us.posthog.com/project/199773/surveys/01a04133-c454-0000-ab38-aabdb839e333',
    })
    expect(Object.values(SURVEY_DEFS).map(survey => survey.id)).not.toContain('019e5a4e-7001-0000-0001-000000000001')
    expect(Object.values(SURVEY_DEFS).map(survey => survey.id)).not.toContain('019e5a4e-7002-0000-0002-000000000002')
    expect(Object.values(SURVEY_DEFS).map(survey => survey.id)).not.toContain('019e5a4e-7003-0000-0003-000000000003')
  })

  it('uses four real, single-question PostHog records for STS-599 crew checkpoints', () => {
    const keys = [
      'lnm_crew_first_hire',
      'lnm_crew_academy_built',
      'lnm_crew_first_launch',
      'lnm_crew_first_specialisation',
    ]
    for (const key of keys) {
      const survey = SURVEY_DEFS[key]
      expect(survey.id).toMatch(/^019/)
      expect(survey.posthogUrl).toBe(`https://us.posthog.com/project/199773/surveys/${survey.id}`)
      expect(survey.questions).toHaveLength(1)
    }
  })

  it('emits PostHog survey responses in current and legacy formats', () => {
    // buildPostHogSurveyPayload itself still supports multi-question
    // surveys — none of Landnam's own SURVEY_DEFS use more than one
    // question since the M2/M3 split (KES-262), so exercise it against a
    // synthetic multi-question survey rather than a real def.
    const survey = SURVEY_DEFS.lnm_m3_transport_clarity
    const multiQuestionSurvey = {
      ...survey,
      questions: [
        { id: 'm3-transport-clarity', type: 'multiple_choice' as const, question: 'How clear was it that this was a two-stop delivery job?', choices: ['Crystal clear', 'Mostly clear'] },
        { id: 'm3-client-choice', type: 'multiple_choice' as const, question: 'How did picking between the two clients feel?', choices: ['Meaningful', 'Confusing'] },
        { id: 'm3-rating', type: 'rating' as const, question: 'How are you feeling about the game after three missions?', scale: 5 },
        { id: 'm3-freetext', type: 'open' as const, question: 'Anything we should know before you play more?' },
      ],
    }
    const payload = buildPostHogSurveyPayload(multiQuestionSurvey, {
      'm3-transport-clarity': 'Mostly clear',
      'm3-client-choice': 'Meaningful',
      'm3-rating': 5,
    })

    expect(payload).toMatchObject({
      $survey_id: multiQuestionSurvey.id,
      $survey_name: multiQuestionSurvey.name,
      $survey_completed: true,
      $survey_response: 'Mostly clear',
      $survey_response_1: 'Meaningful',
      $survey_response_2: 5,
      '$survey_response_m3-transport-clarity': 'Mostly clear',
      '$survey_response_m3-client-choice': 'Meaningful',
      '$survey_response_m3-rating': 5,
    })
    expect(payload.$survey_submission_id).toEqual(expect.any(String))
    expect(payload.$survey_questions).toEqual([
      { id: 'm3-transport-clarity', question: multiQuestionSurvey.questions[0].question, response: 'Mostly clear' },
      { id: 'm3-client-choice', question: multiQuestionSurvey.questions[1].question, response: 'Meaningful' },
      { id: 'm3-rating', question: multiQuestionSurvey.questions[2].question, response: 5 },
      { id: 'm3-freetext', question: multiQuestionSurvey.questions[3].question, response: undefined },
    ])
  })

  // Review coverage for "Update PostHog surveys for new M1-M3 mission
  // structure" (update-posthog-surveys-m1-m3-mission-structure): M3 became
  // a client transport mission, so the old self-directed-mining survey
  // copy must never reappear, and M1-M3 must each ask about the new
  // client/mission choice step.
  it('never asks the stale self-directed-mining M3 questions ("first custom mining run" / "choosing your own target")', () => {
    const allQuestionText = Object.values(SURVEY_DEFS)
      .flatMap(survey => survey.questions.map(q => q.question))
      .join(' ')
    expect(allQuestionText).not.toMatch(/custom mining run/i)
    expect(allQuestionText).not.toMatch(/choosing your own target/i)
  })

  it('M1, M2, and M3 each ask about the new client/mission choice step', () => {
    // M2/M3 split into per-question surveys (KES-262) — check the group
    // of split keys for each milestone instead of one combined def.
    const milestoneKeyGroups = [
      ['lnm_m1_complete'],
      ['lnm_m2_mission_choice', 'lnm_m2_rocket_clarity', 'lnm_m2_rating', 'lnm_m2_freetext'],
      ['lnm_m3_transport_clarity', 'lnm_m3_client_choice', 'lnm_m3_rating', 'lnm_m3_freetext'],
    ] as const
    for (const keys of milestoneKeyGroups) {
      const questionIds = keys.flatMap(key => SURVEY_DEFS[key].questions.map(q => q.id))
      expect(questionIds.some(id => id.includes('mission-choice') || id.includes('client-choice'))).toBe(true)
    }
  })
})

describe('post-mission survey gating', () => {
  // Server/test environment has no `window`, matching how these helpers
  // behave for SSR — they default to the least-noisy behavior (repeat
  // surveys off, milestone variant 'm2') rather than throwing.
  it('defaults repeat-survey eligibility to false without a window', () => {
    expect(isRepeatSurveyEligible()).toBe(false)
  })

  it('defaults the milestone survey variant to m2 without a window', () => {
    expect(getMilestoneSurveyVariant()).toBe('m2')
  })
})
