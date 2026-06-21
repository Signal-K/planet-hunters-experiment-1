import { NextRequest, NextResponse } from 'next/server'
import webpush from 'web-push'
import PocketBase from 'pocketbase'

webpush.setVapidDetails(
  process.env.VAPID_SUBJECT!,
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!,
)

export async function POST(req: NextRequest) {
  const { title, body, url, userId } = await req.json()
  if (!title || !body) {
    return NextResponse.json({ error: 'title and body required' }, { status: 400 })
  }

  const pb = new PocketBase(process.env.NEXT_PUBLIC_LANDNAM_PB_URL)

  const filter = userId ? `user_id = "${userId}"` : 'endpoint != ""'
  const records = await pb.collection('push_subscriptions').getFullList({ filter })

  const payload = JSON.stringify({ title, body, url: url ?? '/game' })

  const results = await Promise.allSettled(
    records.map(r =>
      webpush.sendNotification(
        { endpoint: r.endpoint, keys: r.keys },
        payload,
      )
    )
  )

  const failed = results.filter(r => r.status === 'rejected').length
  return NextResponse.json({ sent: records.length - failed, failed })
}
