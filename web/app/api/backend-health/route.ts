import { NextResponse } from 'next/server'
import { landnamPbUrl, sharedPbUrl } from '@/lib/pb-config'

export const dynamic = 'force-dynamic'

function serverPbUrl(internal: string | undefined, publicUrl: string): string {
  const trimmed = internal?.trim() ?? ''
  return trimmed.length > 0 ? trimmed : publicUrl
}

export async function GET() {
  const sharedUrl = serverPbUrl(process.env.POCKETBASE_INTERNAL_URL, sharedPbUrl())
  const landnamUrl = serverPbUrl(
    process.env.POCKETBASE_LANDNAM_INTERNAL_URL ?? process.env.POCKETBASE_INTERNAL_URL,
    landnamPbUrl(),
  )

  const results = {
    shared: { ok: false, url: sharedUrl },
    landnam: { ok: false, url: landnamUrl }
  }

  try {
    const res = await fetch(`${sharedUrl}/api/health`, { cache: 'no-store' })
    results.shared.ok = res.ok
  } catch (e) {}

  try {
    const res = await fetch(`${landnamUrl}/api/health`, { cache: 'no-store' })
    results.landnam.ok = res.ok
  } catch (e) {}

  // For E2E tests in local compose, the shared backend might not be up.
  // We only HARD-FAIL if the primary game backend (landnam) is down.
  const criticalOk = results.landnam.ok

  return NextResponse.json({
    ok: criticalOk,
    backends: results
  }, { status: criticalOk ? 200 : 503 })
}
