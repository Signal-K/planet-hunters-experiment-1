import { Resend } from 'resend'
import { NextRequest, NextResponse } from 'next/server'

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
