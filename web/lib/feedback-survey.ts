// The in-game Feedback sheet reports into the live "[Landnam / Support]
// Feedback Beacon" PostHog survey, so feedback sits next to every other
// survey answer. Captured from the browser (SSL-357), not the feedback API
// route, so it keeps the player's session, URL and geo.
const FEEDBACK_SURVEY = {
  id: '019e7269-3773-0000-a6d1-d944a8724a09',
  name: '[Landnam / Support] Feedback Beacon',
  questions: [
    {
      id: '3c33b3c8-d0fd-48e2-9361-2f6f3835e842',
      question: 'What do you need help with?',
      response: 'I have a suggestion',
    },
    {
      id: '94d7c8d2-bac4-437a-8caf-8702f64cc78b',
      question: 'Tell us more — what happened and what were you trying to do?',
    },
  ],
}

export function feedbackSurveyPayload(text: string) {
  return {
    $survey_id: FEEDBACK_SURVEY.id,
    $survey_name: FEEDBACK_SURVEY.name,
    $survey_completed: true,
    $survey_submission_id: `${FEEDBACK_SURVEY.id}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    $survey_questions: [
      FEEDBACK_SURVEY.questions[0],
      { ...FEEDBACK_SURVEY.questions[1], response: text },
    ],
    [`$survey_response_${FEEDBACK_SURVEY.questions[0].id}`]: FEEDBACK_SURVEY.questions[0].response,
    [`$survey_response_${FEEDBACK_SURVEY.questions[1].id}`]: text,
    $survey_response: FEEDBACK_SURVEY.questions[0].response,
    $survey_response_1: text,
    source: 'in_game_button',
  }
}
