import { describe, expect, it } from 'vitest'
import { buildPostHogSurveyPayload, SURVEY_DEFS } from './surveys'

describe('buildPostHogSurveyPayload', () => {
  it('uses real PostHog survey records for tutorial completion surveys', () => {
    expect(SURVEY_DEFS.lnm_m1_complete).toMatchObject({
      id: '019f36f7-3d1d-0000-08d3-3c4d0d132f2e',
      posthogUrl: 'https://us.posthog.com/project/199773/surveys/019f36f7-3d1d-0000-08d3-3c4d0d132f2e',
    })
    expect(SURVEY_DEFS.lnm_m2_complete).toMatchObject({
      id: '019f36f7-5cd2-0000-ab19-7335d90b1e4a',
      posthogUrl: 'https://us.posthog.com/project/199773/surveys/019f36f7-5cd2-0000-ab19-7335d90b1e4a',
    })
    expect(SURVEY_DEFS.lnm_m3_complete).toMatchObject({
      id: '019f36f7-9396-0000-9271-74f9bba0546a',
      posthogUrl: 'https://us.posthog.com/project/199773/surveys/019f36f7-9396-0000-9271-74f9bba0546a',
    })
    expect(Object.values(SURVEY_DEFS).map(survey => survey.id)).not.toContain('019e5a4e-7001-0000-0001-000000000001')
    expect(Object.values(SURVEY_DEFS).map(survey => survey.id)).not.toContain('019e5a4e-7002-0000-0002-000000000002')
    expect(Object.values(SURVEY_DEFS).map(survey => survey.id)).not.toContain('019e5a4e-7003-0000-0003-000000000003')
  })

  it('emits PostHog survey responses in current and legacy formats', () => {
    const survey = SURVEY_DEFS.lnm_m3_complete
    const payload = buildPostHogSurveyPayload(survey, {
      'm3-transport-clarity': 'Mostly clear',
      'm3-client-choice': 'Meaningful',
      'm3-rating': 5,
    })

    expect(payload).toMatchObject({
      $survey_id: survey.id,
      $survey_name: survey.name,
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
      { id: 'm3-transport-clarity', question: survey.questions[0].question, response: 'Mostly clear' },
      { id: 'm3-client-choice', question: survey.questions[1].question, response: 'Meaningful' },
      { id: 'm3-rating', question: survey.questions[2].question, response: 5 },
      { id: 'm3-freetext', question: survey.questions[3].question, response: undefined },
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
    for (const key of ['lnm_m1_complete', 'lnm_m2_complete', 'lnm_m3_complete'] as const) {
      const questionIds = SURVEY_DEFS[key].questions.map(q => q.id)
      expect(questionIds.some(id => id.includes('mission-choice') || id.includes('client-choice'))).toBe(true)
    }
  })
})
