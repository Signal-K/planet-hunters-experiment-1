import { NextRequest, NextResponse } from 'next/server'
import PocketBase from 'pocketbase'
import { withPbRetry } from '@/lib/pbRetry'

export async function POST(req: NextRequest) {
  const { subscription, userId } = await req.json()
  if (!subscription?.endpoint) {
    return NextResponse.json({ error: 'missing subscription' }, { status: 400 })
  }

  const pb = new PocketBase(process.env.NEXT_PUBLIC_LANDNAM_PB_URL)

  try {
    await withPbRetry(async () => {
      const existing = await pb.collection('push_subscriptions').getFirstListItem(
        `endpoint = "${subscription.endpoint}"`
      ).catch(() => null)

      if (!existing) {
        await pb.collection('push_subscriptions').create({
          endpoint: subscription.endpoint,
          keys: subscription.keys,
          user_id: userId ?? '',
        })
      }
    })

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('push subscribe error:', err)
    return NextResponse.json({ error: 'failed to save subscription' }, { status: 500 })
  }
}
