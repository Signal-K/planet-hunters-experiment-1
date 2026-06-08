import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  const sharedUrl = process.env.POCKETBASE_INTERNAL_URL
    ?? process.env.NEXT_PUBLIC_SHARED_PB_URL
    ?? 'http://localhost:8090'
  
  const landnamUrl = process.env.NEXT_PUBLIC_LANDNAM_PB_URL
    ?? 'http://localhost:8093'

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
