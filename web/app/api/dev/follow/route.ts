import { readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

// Dev only: tells <DevFollow/> which page the agent is editing and which scripted actions to replay. 404 in production.
export const dynamic = 'force-dynamic'
const actionsFile = () => join(process.cwd(), '.dev-actions.json')
const resultFile = () => join(process.cwd(), '.dev-result.json')

export async function GET() {
  if (process.env.NODE_ENV !== 'development') return new Response(null, { status: 404 })
  let follow: Record<string, unknown> = { route: null, ts: 0 }
  let act: Record<string, unknown> = { actions: [], actionsTs: 0 }
  try { follow = JSON.parse(await readFile(join(process.cwd(), '.dev-follow.json'), 'utf8')) } catch { /* none yet */ }
  try { act = JSON.parse(await readFile(actionsFile(), 'utf8')) } catch { /* none yet */ }
  let result: unknown = null
  try { result = JSON.parse(await readFile(resultFile(), 'utf8')) } catch { /* none yet */ }
  return Response.json({ ...follow, ...act, result }, {
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      Pragma: 'no-cache',
      Expires: '0',
    },
  })
}

/**
 * Body: `{ actions: [{ key, hold? } | { click } | { see } | { gone } | { wait }], id? }`. `click` is an aria-label or visible text.
 * `see` / `gone` assert text or a CSS selector appears / disappears. With an `id`, the tab reports back through `{ result }`.
 */
export async function POST(req: Request) {
  if (process.env.NODE_ENV !== 'development') return new Response(null, { status: 404 })
  const body = (await req.json()) as { actions?: unknown[]; id?: string; result?: unknown }
  if (body.result) {
    await writeFile(resultFile(), JSON.stringify(body.result))
    return Response.json({ ok: true })
  }
  await writeFile(resultFile(), 'null')
  await writeFile(actionsFile(), JSON.stringify({ actions: body.actions ?? [], id: body.id ?? null, actionsTs: Date.now() }))
  return Response.json({ ok: true })
}
