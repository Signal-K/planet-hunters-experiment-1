import { appendFile, mkdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import { isDevLauncherEnabled } from '@/lib/devAccess'
import { storyboardDir } from '@/lib/storyboard-dir'

// Review comments between the reviewer (storyboard UI) and the agent. One JSONL file, append only.
//  - POST: reviewer comment. The agent watches the file (scripts/storyboard-watch.sh), so it arrives mid-task
//    as a notification instead of waiting for the agent's turn to end.
//  - GET: whole thread (reviewer comments and agent replies written by scripts/storyboard-reply.sh).
const commentsFile = () => process.env.STORYBOARD_COMMENTS_FILE ?? path.join(storyboardDir(), 'comments.jsonl')
const MAX = 4000

export async function GET() {
  if (!isDevLauncherEnabled()) return new Response('Not found', { status: 404 })
  let raw = ''
  try { raw = await readFile(commentsFile(), 'utf8') } catch { /* no comments yet */ }
  const thread = raw.split('\n').filter(Boolean).flatMap(l => { try { return [JSON.parse(l)] } catch { return [] } }).slice(-200)
  return Response.json({ thread }, { headers: { 'cache-control': 'no-store' } })
}

export async function POST(req: Request) {
  if (!isDevLauncherEnabled()) return new Response('Not found', { status: 404 })
  const body = (await req.json().catch(() => null)) as { text?: unknown; scene?: unknown; ticket?: unknown; viewport?: unknown } | null
  const text = typeof body?.text === 'string' ? body.text.trim().slice(0, MAX) : ''
  if (!text) return Response.json({ error: 'empty' }, { status: 400 })
  const entry = {
    id: `c${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
    at: new Date().toISOString(),
    from: 'user',
    text,
    scene: typeof body?.scene === 'string' ? body.scene : '',
    ticket: typeof body?.ticket === 'string' ? body.ticket : '',
    viewport: typeof body?.viewport === 'string' ? body.viewport : '',
  }
  await mkdir(path.dirname(commentsFile()), { recursive: true })
  await appendFile(commentsFile(), JSON.stringify(entry) + '\n')
  return Response.json(entry)
}
