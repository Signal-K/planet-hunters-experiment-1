import { redirect } from 'next/navigation'
import type { ScenePreset, Thing } from '@/lib/authoring/docs'
import { loadScene, loadStudioIndex, studioEnabled } from '@/lib/authoring/studio-load'
import { stageSrc } from '@/lib/authoring/studio-model'
import { composeSetup, defaultSelection, presetSelection } from '@/lib/authoring/things'
import StudioView from './StudioView'
import type { StudioPreset } from './StudioView'

export const dynamic = 'force-dynamic'

// A scene's fixtures text follows this marker line in the merged scene text (lib/authoring/fixtures-merge.ts).
const MARKER = /^# ---- fixtures: (\S+) \(edit them here, they save to that file\) ----\n/m

// Scene Studio (dev only): the live scene, its presets and what to check. The script itself is edited in the editor.
// /game/studio?scene=hub&preset=full-base, or &state=<checkpoint> for a game checkpoint.
export default async function StudioPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  if (!studioEnabled()) redirect('/game')
  const params = await searchParams
  const scenes = loadStudioIndex().scenes.filter(s => s.previewState).map(s => ({ id: s.id, name: s.name }))
  const id = scenes.some(s => s.id === params.scene) ? params.scene! : 'hub'
  const bundle = loadScene(id)
  const doc = bundle.scene.value as { things?: Thing[]; presets?: ScenePreset[]; preview?: { state?: string } } | null
  const entry = doc?.preview?.state
  const things = doc?.things ?? []

  // The file the presets live in, and the line each one starts on, so the editor can jump to it.
  const text = bundle.scene.text
  const marker = MARKER.exec(text)
  const file = marker ? marker[1] : bundle.scene.file
  const lines = (marker ? text.slice(marker.index + marker[0].length) : text).split('\n')
  const lineOf = (presetId: string): number | undefined => {
    const at = lines.findIndex(l => l.trim() === `id = "${presetId}"`)
    return at < 0 ? undefined : Math.max(1, at) // the [[presets]] header is the line above `id`
  }

  const make = (ref: string, name: string, src: string | null, instructions?: string, line?: number): StudioPreset => ({
    ref,
    name,
    src,
    line,
    checks: (instructions ?? '').split(/(?<=[.!?])\s+/).map(s => s.trim()).filter(Boolean),
  })
  const presets = [
    make(id, 'Start', entry ? stageSrc(entry, composeSetup(things, defaultSelection(things)), 0) : null),
    ...(doc?.presets ?? []).map(p => make(`${id}/${p.id}`, p.name, entry ? stageSrc(entry, composeSetup(things, presetSelection(p, things)), 0) : null, p.instructions, lineOf(p.id))),
  ]
  const checkpoint = params.state ? bundle.fixtures.find(f => f.key === params.state) : undefined
  if (checkpoint) presets.push(make(`${id}@${checkpoint.key}`, checkpoint.label, stageSrc(checkpoint.key, null, 0), checkpoint.hint))
  const initial = checkpoint ? `${id}@${checkpoint.key}` : presets.find(p => p.ref === `${id}/${params.preset}`)?.ref ?? id

  return <StudioView scenes={scenes} sceneId={id} presets={presets} initial={initial} file={file} />
}
