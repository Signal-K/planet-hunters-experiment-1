import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { isDevLauncherEnabled } from '@/lib/devAccess'
import { storyboardDir } from '@/lib/storyboard-dir'

// Serves native snapshot PNGs for the storyboard from $SNAPSHOT_DIR (default web/.storyboard/snap, written by scripts/native-shots.sh).
export async function GET(_req: Request, { params }: { params: Promise<{ name: string }> }) {
  if (!isDevLauncherEnabled()) return new Response('Not found', { status: 404 })
  const { name } = await params
  if (!/^[\w-]+\.png$/.test(name)) return new Response('Bad name', { status: 400 })
  try {
    const dir = process.env.SNAPSHOT_DIR ?? path.join(storyboardDir(), 'snap')
    const data = await readFile(path.join(dir, name))
    return new Response(new Uint8Array(data), { headers: { 'content-type': 'image/png', 'cache-control': 'no-store' } })
  } catch {
    return new Response('No snapshot', { status: 404 })
  }
}
