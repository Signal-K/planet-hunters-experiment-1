import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { studioEnabled, studioRoot } from '@/lib/authoring/studio-load'

// Dev only: serves a feedback reference screenshot from shared/authoring/feedback/refs/.
export const dynamic = 'force-dynamic'

const TYPES: Record<string, string> = { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', webp: 'image/webp' }

export async function GET(req: Request) {
  if (!studioEnabled()) return new Response(null, { status: 404 })
  const name = new URL(req.url).searchParams.get('name') ?? ''
  const type = TYPES[name.split('.').pop() ?? '']
  if (!/^[a-z0-9-]+\.(png|jpe?g|webp)$/.test(name) || !type) return new Response('Bad name', { status: 400 })
  const file = join(studioRoot(), 'shared/authoring/feedback/refs', name)
  if (!existsSync(file)) return new Response('No such reference', { status: 404 })
  return new Response(new Uint8Array(readFileSync(file)), { headers: { 'content-type': type, 'cache-control': 'no-store' } })
}
