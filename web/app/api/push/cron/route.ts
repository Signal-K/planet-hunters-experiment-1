import { NextRequest, NextResponse } from 'next/server'
import webpush from 'web-push'
import PocketBase from 'pocketbase'
import { landnamPbUrl } from '@/lib/pb-config'
import { withPbRetry } from '@/lib/pbRetry'

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (secret) {
    const auth = req.headers.get('authorization') ?? req.nextUrl.searchParams.get('secret')
    if (auth !== secret && auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
    }
  }

  // web-push throws on missing or malformed VAPID settings, which used to surface as an empty 500.
  const { VAPID_SUBJECT, NEXT_PUBLIC_VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY } = process.env
  if (!VAPID_SUBJECT || !NEXT_PUBLIC_VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
    return NextResponse.json({ error: 'push not configured' }, { status: 503 })
  }

  const serviceEmail = process.env.LANDNAM_PB_SERVICE_EMAIL
  const servicePassword = process.env.LANDNAM_PB_SERVICE_PASSWORD
  if (!serviceEmail || !servicePassword) {
    return NextResponse.json({ error: 'push service not configured' }, { status: 503 })
  }

  try {
    webpush.setVapidDetails(VAPID_SUBJECT, NEXT_PUBLIC_VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY)
  } catch (error) {
    console.error('push cron VAPID configuration error:', error)
    return NextResponse.json({ error: 'push not configured' }, { status: 503 })
  }

  const pb = new PocketBase(landnamPbUrl())
  try {
    // scheduled_notifications has no public list/update rule: authenticate the
    // server-only cron client before loading or acknowledging due work.
    await withPbRetry(() => pb.collection('_superusers').authWithPassword(serviceEmail, servicePassword))

    const now = Date.now()
    const records = await withPbRetry(() =>
      pb.collection('scheduled_notifications').getFullList({
        filter: `scheduled_for <= ${now} && sent = false`,
      })
    )

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
  } catch (error) {
    console.error('push cron error:', error)
    return NextResponse.json({ error: 'push service unavailable' }, { status: 502 })
  }
}
