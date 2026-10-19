import { readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

// Dev only: tells <DevFollow/> which page the agent is editing and which scripted actions to replay. 404 in production.
export const dynamic = 'force-dynamic'
const actionsFile = () => join(process.cwd(), '.dev-actions.json')

export async function GET() {
  if (process.env.NODE_ENV !== 'development') return new Response(null, { status: 404 })
  let follow: Record<string, unknown> = { route: null, ts: 0 }
  let act: Record<string, unknown> = { actions: [], actionsTs: 0 }
  try { follow = JSON.parse(await readFile(join(process.cwd(), '.dev-follow.json'), 'utf8')) } catch { /* none yet */ }
  try { act = JSON.parse(await readFile(actionsFile(), 'utf8')) } catch { /* none yet */ }
  return Response.json({ ...follow, ...act }, {
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      Pragma: 'no-cache',
      Expires: '0',
    },
  })
}

/** Body: `{ actions: [{ key, hold? } | { click } | { wait }] }`. `click` is an aria-label or visible text. */
export async function POST(req: Request) {
  if (process.env.NODE_ENV !== 'development') return new Response(null, { status: 404 })
  const { actions } = (await req.json()) as { actions?: unknown[] }
  await writeFile(actionsFile(), JSON.stringify({ actions: actions ?? [], actionsTs: Date.now() }))
  return Response.json({ ok: true })
}
