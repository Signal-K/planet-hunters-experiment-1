import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const { payload, distinctId } = await req.json()
  if (!payload?.$survey_id || !payload?.$survey_name) {
    return NextResponse.json({ error: 'invalid survey payload' }, { status: 400 })
  }

  const apiKey = process.env.NEXT_PUBLIC_POSTHOG_KEY
  if (!apiKey) {
    console.error('[api/surveys] NEXT_PUBLIC_POSTHOG_KEY missing at runtime — cannot forward survey response')
    return NextResponse.json({ error: 'posthog not configured' }, { status: 500 })
  }

  const host = process.env.NEXT_PUBLIC_POSTHOG_HOST ?? 'https://us.i.posthog.com'
  const response = await fetch(`${host.replace(/\/$/, '')}/capture/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      api_key: apiKey,
      event: 'survey sent',
      properties: {
        ...payload,
        distinct_id: distinctId || 'server-survey',
        captured_from: 'survey_api',
      },
    }),
  }).catch(err => {
    console.error('[api/surveys] posthog capture request failed', err)
    return null
  })
  if (!response?.ok) {
    return NextResponse.json({ error: 'posthog capture failed' }, { status: 502 })
  }

  return NextResponse.json({ ok: true })
}
