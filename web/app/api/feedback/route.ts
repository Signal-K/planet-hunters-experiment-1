import { Resend } from 'resend'
import { NextRequest, NextResponse } from 'next/server'

const FEEDBACK_SURVEY = {
  id: '019e7269-3773-0000-a6d1-d944a8724a09',
  name: 'Landnám: Feedback',
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

function feedbackSurveyPayload(text: string) {
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
  }
}

async function captureFeedbackInPostHog(text: string, distinctId?: string) {
  const apiKey = process.env.NEXT_PUBLIC_POSTHOG_KEY
  if (!apiKey) return

  const host = process.env.NEXT_PUBLIC_POSTHOG_HOST ?? 'https://us.i.posthog.com'
  const payload = feedbackSurveyPayload(text)
  await fetch(`${host.replace(/\/$/, '')}/capture/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      api_key: apiKey,
      event: 'survey sent',
      properties: {
        ...payload,
        distinct_id: distinctId || 'server-feedback',
        source: 'in_game_button',
        captured_from: 'feedback_api',
      },
    }),
  }).catch(() => {})
}

export async function POST(req: NextRequest) {
  const { text, distinctId } = await req.json()
  if (!text?.trim()) return NextResponse.json({ error: 'empty' }, { status: 400 })

  const trimmed = text.trim()
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    await captureFeedbackInPostHog(trimmed, distinctId)
    return NextResponse.json({ ok: true })
  }

  const resend = new Resend(apiKey)
  await resend.emails.send({
    from: 'Landnam Feedback <onboarding@resend.dev>',
    to: process.env.FEEDBACK_EMAIL ?? 'liam@skinetics.tech',
    subject: `Landnam player feedback`,
    text: trimmed,
  })
  await captureFeedbackInPostHog(trimmed, distinctId)

  return NextResponse.json({ ok: true })
}
