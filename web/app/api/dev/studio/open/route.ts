import { openInEditor, planOpen, repoRelative } from '@/lib/authoring/open-editor'
import { studioEnabled, studioRoot } from '@/lib/authoring/studio-load'
import type { OpenResponse } from '@/lib/authoring/studio-types'

// Dev only: the Studio asks this to open a script in Cursor. Cursor's built-in browser will not follow cursor:// links, and the
// dev server runs in Docker, which cannot launch an app on the host. So in Docker this passes the request to the Cursor helper
// (scripts/host-opener.mjs, started by `make up`), and outside Docker it opens the file itself.
export const dynamic = 'force-dynamic'

const noStore = { 'Cache-Control': 'no-store, must-revalidate' }
const reply = (body: OpenResponse, status = 200) => Response.json(body, { status, headers: noStore })
const helperUrl = () => process.env.LANDNAM_OPENER_URL ?? 'http://host.docker.internal:3098'
const whole = (n: unknown) => (typeof n === 'number' ? n : undefined)

export async function POST(req: Request) {
  if (!studioEnabled()) return new Response(null, { status: 404 })
  // JSON only: a cross-site form post cannot send it without a CORS preflight, which this route never answers.
  if (!req.headers.get('content-type')?.includes('application/json')) return reply({ ok: false, reason: 'bad-request', message: 'Send application/json.' }, 415)
  let body: { file?: unknown; line?: unknown; column?: unknown }
  try { body = await req.json() } catch { return reply({ ok: false, reason: 'bad-request', message: 'That request was not JSON.' }, 400) }

  const root = studioRoot()
  const file = typeof body.file === 'string' ? repoRelative(body.file, [process.env.LANDNAM_HOST_ROOT || undefined, root]) : null
  if (!file) return reply({ ok: false, reason: 'bad-request', message: 'That file is outside the repo.' }, 400)
  // This server's own view of the repo says whether the request is sound; the helper checks again on the host.
  const plan = planOpen(root, { file, line: whole(body.line), column: whole(body.column) })
  if (!plan.ok) return reply({ ok: false, reason: 'bad-request', message: plan.message }, 400)

  if (!process.env.LANDNAM_REPO_ROOT) {
    const result = await openInEditor(plan.target)
    return result.ok
      ? reply({ ok: true, file: plan.target.file, line: plan.target.line, command: result.command })
      : reply({ ok: false, reason: 'editor-failed', message: result.message }, 502)
  }

  try {
    const res = await fetch(`${helperUrl()}/open`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ file: plan.target.file, line: plan.target.line, column: plan.target.column }),
      signal: AbortSignal.timeout(10_000),
      cache: 'no-store',
    })
    return reply((await res.json()) as OpenResponse, res.status)
  } catch {
    return reply({ ok: false, reason: 'helper-offline', message: 'The Cursor helper is not running. Start it with make up (or node scripts/host-opener.mjs start).' }, 503)
  }
}
