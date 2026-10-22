import { redirect } from 'next/navigation'
import { loadData, loadScene, loadStudioIndex, studioEnabled } from '@/lib/authoring/studio-load'
import { resolveFocusScenes } from '@/lib/authoring/studio-model'
import type { ViewportKey } from '@/lib/authoring/studio-model'
import { defaultSelection, presetSelection, setValue, toggleThing } from '@/lib/authoring/things'
import type { Selection } from '@/lib/authoring/things'
import OpenLinks from './OpenLinks'
import StudioClient from './StudioClient'
import type { Target } from './StudioClient'
import type { View } from './PresetPicker'

export const dynamic = 'force-dynamic'

// Scene Studio (dev only): every scene as a script you can see, edit and preview in the real game with no login.
// Deep links: /game/studio?scene=hub&preset=full-base&vp=ph&tab=objects or ?data=world:base-world.
export default async function StudioPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  if (!studioEnabled()) redirect('/game')
  const params = await searchParams
  const index = loadStudioIndex()

  const data = params.data?.split(':')
  let target: Target
  let scene = null
  let dataBundle = null
  let view: View = { kind: 'start' }
  let selection: Selection = { on: [], values: {} }
  try {
    if (data && (data[0] === 'world' || data[0] === 'mission') && data[1]) {
      target = { type: 'data', kind: data[0], id: data[1] }
      dataBundle = loadData(target.kind, target.id)
      view = params.state ?? dataBundle.previewState ? { kind: 'checkpoint', key: params.state ?? dataBundle.previewState! } : { kind: 'start' }
    } else {
      const focused = resolveFocusScenes(index.scenes, index.focus?.scenes ?? [])[0]
      const id = params.scene ?? focused ?? 'hub'
      target = { type: 'scene', id }
      scene = loadScene(id)
      const doc = scene.scene.value as { things?: import('@/lib/authoring/docs').Thing[]; presets?: import('@/lib/authoring/docs').ScenePreset[] } | null
      const things = doc?.things ?? []
      selection = defaultSelection(things)
      if (params.state && scene.fixtures.some(f => f.key === params.state)) view = { kind: 'checkpoint', key: params.state }
      else if (params.preset) {
        const preset = (doc?.presets ?? []).find(item => item.id === params.preset)
        if (preset) { view = { kind: 'preset', id: preset.id }; selection = presetSelection(preset, things) }
      } else if (params.things || params.values) {
        let next = selection
        for (const id of (params.things ?? '').split(',').filter(Boolean)) next = toggleThing(next, things, id)
        for (const item of (params.values ?? '').split(',').filter(Boolean)) { const [id, raw] = item.split(':'); const value = Number(raw); if (id && Number.isFinite(value)) next = setValue(next, id, value) }
        selection = next; view = { kind: 'custom' }
      }
    }
  } catch {
    target = { type: 'scene', id: 'hub' }
    scene = loadScene('hub')
    selection = defaultSelection(((scene.scene.value as { things?: import('@/lib/authoring/docs').Thing[] } | null)?.things ?? []))
  }

  const vp: ViewportKey = params.vp === 'ls' || params.vp === 'dk' ? params.vp : 'ph'
  const tab = params.tab === 'notes' || params.tab === 'objects' || params.tab === 'project' || params.tab === 'setup'
    ? params.tab
    : params.tab === 'script' ? 'project'
    : params.tab === 'things' ? 'setup'
    : params.mode === 'edit' ? 'objects'
    : 'objects'
  const flow = params.flow ? index.flows.find(item => item.id === params.flow) : undefined
  const requestedStep = Math.max(0, Number(params.step ?? '1') - 1)
  const initialFlow = flow ? { id: flow.id, step: Math.min(requestedStep, Math.max(0, flow.steps.length - 1)) } : null
  return <OpenLinks><StudioClient initialIndex={index} initialTarget={target} initialScene={scene} initialData={dataBundle} initialView={view} initialSelection={selection} initialVp={vp} initialTab={tab} initialFlow={initialFlow} follow={params.follow === '1'} /></OpenLinks>
}
