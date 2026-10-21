import { readFocus } from '@/lib/authoring/focus'
import { compileAll } from '@/lib/authoring/compile'
import { editDocument, promoteNote, saveReference, setFocus, writeDocument, writeNote } from '@/lib/authoring/studio-server'
import { dataSignature, loadData, loadScene, loadStudioIndex, sceneSignature, studioContext, studioEnabled, studioRoot } from '@/lib/authoring/studio-load'
import type { StudioRequest, StudioResponse } from '@/lib/authoring/studio-types'

// Dev only: the Scene Studio reads and edits shared/authoring/ through this route. 404 anywhere but `next dev`.
export const dynamic = 'force-dynamic'

const noStore = { 'Cache-Control': 'no-store, must-revalidate' }
const fail = (error: unknown, status = 400) => Response.json({ ok: false, error: error instanceof Error ? error.message : String(error) }, { status, headers: noStore })

export async function GET(req: Request) {
  if (!studioEnabled()) return new Response(null, { status: 404 })
  const params = new URL(req.url).searchParams
  try {
    if (params.has('index')) return Response.json(loadStudioIndex(), { headers: noStore })
    if (params.has('focus')) return Response.json(readFocus(studioRoot()), { headers: noStore })
    const sig = params.get('sig')
    const scene = params.get('scene')
    if (scene) {
      if (sig && sig === sceneSignature(scene)) return Response.json({ unchanged: true }, { headers: noStore })
      return Response.json(loadScene(scene), { headers: noStore })
    }
    const data = params.get('data')?.split(':')
    if (data && (data[0] === 'world' || data[0] === 'mission')) {
      if (sig && sig === dataSignature(data[0], data[1])) return Response.json({ unchanged: true }, { headers: noStore })
      return Response.json(loadData(data[0], data[1]), { headers: noStore })
    }
    return fail('say what to read: ?index, ?scene=<id> or ?data=world:<id>')
  } catch (error) {
    return fail(error, 404)
  }
}

export async function POST(req: Request) {
  if (!studioEnabled()) return new Response(null, { status: 404 })
  // JSON only: a cross-site form post cannot send it without a CORS preflight, which this route never answers.
  if (!req.headers.get('content-type')?.includes('application/json')) return fail('send application/json', 415)
  try {
    const body = (await req.json()) as StudioRequest
    const root = studioRoot()
    const context = studioContext()
    let response: StudioResponse
    switch (body.action) {
      case 'edit': response = editDocument(root, body.file, body.ops, context, body.expectHash); break
      case 'write': response = writeDocument(root, body.file, body.text, context, body.expectHash); break
      case 'note': response = writeNote(root, body.scene, body.which, body.text); break
      case 'promote': response = promoteNote(root, body.scene); break
      case 'ref': response = saveReference(root, body.scene, body.dataUrl); break
      case 'focus': response = setFocus(root, body.scenes, body.ticket); break
      case 'compile': {
        const result = compileAll({ root, write: true, presets: context.presets })
        response = { ok: true, compile: { ok: result.ok, written: result.files.filter(f => f.status === 'written').map(f => f.path), errors: result.diagnostics.filter(d => d.severity === 'error').length } }
        break
      }
      default: response = { ok: false, error: 'unknown action' }
    }
    return Response.json(response, { status: response.ok || response.stale ? 200 : 400, headers: noStore })
  } catch (error) {
    return fail(error)
  }
}
