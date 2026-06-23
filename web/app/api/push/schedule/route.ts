import { NextRequest, NextResponse } from 'next/server'
import PocketBase from 'pocketbase'

export async function POST(req: NextRequest) {
  const { endpoint, keys, scheduledFor, title, body } = await req.json()
  if (!endpoint || !keys || !scheduledFor || !title || !body) {
    return NextResponse.json({ error: 'missing required fields' }, { status: 400 })
  }

  const pb = new PocketBase(process.env.NEXT_PUBLIC_LANDNAM_PB_URL)

  try {
    // Upsert exact duplicates while allowing multiple pending mission alerts per subscription.
    const existing = await pb.collection('scheduled_notifications').getFirstListItem(
      `endpoint = "${endpoint}" && scheduled_for = ${scheduledFor} && title = "${title}" && sent = false`
    ).catch(() => null)

    if (existing) {
      await pb.collection('scheduled_notifications').update(existing.id, {
        scheduled_for: scheduledFor,
        title,
        body,
      })
    } else {
      await pb.collection('scheduled_notifications').create({
        endpoint,
        keys,
        scheduled_for: scheduledFor,
        title,
        body,
        sent: false,
      })
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('push schedule error:', err)
    return NextResponse.json({ error: 'failed to schedule notification' }, { status: 500 })
  }
}
