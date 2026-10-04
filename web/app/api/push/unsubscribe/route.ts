import { NextRequest, NextResponse } from 'next/server'
import PocketBase from 'pocketbase'

export async function POST(req: NextRequest) {
  const { endpoint } = await req.json()
  if (!endpoint) {
    return NextResponse.json({ error: 'missing endpoint' }, { status: 400 })
  }

  const pb = new PocketBase(process.env.NEXT_PUBLIC_LANDNAM_PB_URL)

  try {
    const record = await pb.collection('push_subscriptions').getFirstListItem(
      `endpoint = "${endpoint}"`
    ).catch(() => null)

    if (record) {
      await pb.collection('push_subscriptions').delete(record.id)
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('push unsubscribe error:', err)
    return NextResponse.json({ error: 'failed to remove subscription' }, { status: 500 })
  }
}
