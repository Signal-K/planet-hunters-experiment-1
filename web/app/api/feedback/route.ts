import { Resend } from 'resend'
import { NextRequest, NextResponse } from 'next/server'

// Emails player feedback to the team. The PostHog "survey sent" event is
// captured by the browser (FeedbackSheet → lib/feedback-survey.ts), so it
// keeps the player's session, URL and geo instead of this server's (SSL-357).
export async function POST(req: NextRequest) {
  const { text } = await req.json()
  if (!text?.trim()) return NextResponse.json({ error: 'empty' }, { status: 400 })

  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) return NextResponse.json({ ok: true })

  const resend = new Resend(apiKey)
  await resend.emails.send({
    from: 'Landnam Feedback <onboarding@resend.dev>',
    to: process.env.FEEDBACK_EMAIL ?? 'liam@skinetics.tech',
    subject: `Landnam player feedback`,
    text: text.trim(),
  })

  return NextResponse.json({ ok: true })
}
