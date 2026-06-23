import { Resend } from 'resend'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const body = await req.json() as {
    surveyKey: string
    surveyName: string
    milestone: string
    rating: number | null
    choice: string | null
    freetext: string | null
    userId: string | null
  }

  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) return NextResponse.json({ ok: true })

  const resend = new Resend(apiKey)

  const lines: string[] = [
    `Milestone: ${body.milestone.toUpperCase()}`,
    `Survey: ${body.surveyName}`,
    '',
  ]
  if (body.rating != null) lines.push(`Rating: ${body.rating}/5`)
  if (body.choice) lines.push(`Choice: ${body.choice}`)
  if (body.freetext?.trim()) lines.push(`\nFeedback:\n${body.freetext.trim()}`)
  if (body.userId) lines.push(`\nUser: ${body.userId}`)

  await resend.emails.send({
    from: 'Landnam Feedback <onboarding@resend.dev>',
    to: process.env.FEEDBACK_EMAIL ?? 'liam@skinetics.tech',
    subject: `[Landnam] ${body.milestone.toUpperCase()} survey — ${body.rating != null ? `${body.rating}/5` : 'submitted'}`,
    text: lines.join('\n'),
  })

  return NextResponse.json({ ok: true })
}
