import { redirect } from 'next/navigation'
import { loadData, loadScene, loadStudioIndex, studioEnabled } from '@/lib/authoring/studio-load'
import { resolveFocusScenes } from '@/lib/authoring/studio-model'
import type { ViewportKey } from '@/lib/authoring/studio-model'
import StudioClient from './StudioClient'
import type { Target } from './StudioClient'

export const dynamic = 'force-dynamic'

// Scene Studio (dev only): every scene as a script you can see, edit and preview in the real game with no login.
// Deep links: /game/studio?scene=hangar&state=ui-hangar-assembly&vp=ph&mode=edit  or  ?data=world:base-world
export default async function StudioPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  if (!studioEnabled()) redirect('/game')
  const params = await searchParams
  const index = loadStudioIndex()

  const data = params.data?.split(':')
  let target: Target
  let scene = null
  let dataBundle = null
  let fixture: string | null = null
  try {
    if (data && (data[0] === 'world' || data[0] === 'mission') && data[1]) {
      target = { type: 'data', kind: data[0], id: data[1] }
      dataBundle = loadData(target.kind, target.id)
      fixture = params.state ?? dataBundle.previewState ?? null
    } else {
      const focused = resolveFocusScenes(index.scenes, index.focus?.scenes ?? [])[0]
      const id = params.scene ?? focused ?? 'hub'
      target = { type: 'scene', id }
      scene = loadScene(id)
      const keys = scene.fixtures.map(f => f.key)
      const preview = (scene.scene.value as { preview?: { state?: string } } | null)?.preview?.state
      fixture = params.state && keys.includes(params.state) ? params.state : preview && keys.includes(preview) ? preview : keys[0] ?? null
    }
  } catch {
    target = { type: 'scene', id: 'hub' }
    scene = loadScene('hub')
    fixture = scene.fixtures[0]?.key ?? null
  }

  const vp: ViewportKey = params.vp === 'ls' || params.vp === 'dk' ? params.vp : 'ph'
  const mode = params.mode === 'edit' || params.tab === 'objects' || params.tab === 'source' ? 'edit' : 'review'
  return <StudioClient initialIndex={index} initialTarget={target} initialScene={scene} initialData={dataBundle} initialFixture={fixture} initialVp={vp} initialMode={mode} follow={params.follow === '1'} />
}
