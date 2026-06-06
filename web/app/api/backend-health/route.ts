import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  const baseUrl = process.env.POCKETBASE_INTERNAL_URL
    ?? process.env.NEXT_PUBLIC_SHARED_PB_URL
    ?? 'http://localhost:8090'

  try {
    const response = await fetch(`${baseUrl}/api/health`, { cache: 'no-store' })
    const payload = await response.json()
    return NextResponse.json({ ok: response.ok, backend: 'pocketbase', payload }, { status: response.status })
  } catch {
    return NextResponse.json({ ok: false, backend: 'pocketbase' }, { status: 503 })
  }
}
