import { NextRequest, NextResponse } from 'next/server'
import webpush from 'web-push'
import PocketBase from 'pocketbase'

export async function GET(req: NextRequest) {
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT!,
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!,
  )
  const secret = process.env.CRON_SECRET
  if (secret) {
    const auth = req.headers.get('authorization') ?? req.nextUrl.searchParams.get('secret')
    if (auth !== secret && auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
    }
  }

  const pb = new PocketBase(process.env.NEXT_PUBLIC_LANDNAM_PB_URL)
  const now = Date.now()

  const records = await pb.collection('scheduled_notifications').getFullList({
    filter: `scheduled_for <= ${now} && sent = false`,
  })

  if (records.length === 0) {
    return NextResponse.json({ sent: 0, failed: 0 })
  }

  const results = await Promise.allSettled(
    records.map(async r => {
      await webpush.sendNotification(
        { endpoint: r.endpoint, keys: r.keys },
        JSON.stringify({ title: r.title, body: r.body, url: '/game' }),
      )
      await pb.collection('scheduled_notifications').update(r.id, { sent: true })
    })
  )

  const failed = results.filter(r => r.status === 'rejected').length
  return NextResponse.json({ sent: records.length - failed, failed })
}
