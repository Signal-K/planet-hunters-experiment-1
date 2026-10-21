'use client'

import type { ScenePreset } from '@/lib/authoring/docs'
import type { Fixture } from '@/lib/authoring/studio-types'
import styles from './Studio.module.css'

/** What the picker can be on: the scene's starting point, a saved preset, an unsaved mix, or a game checkpoint. */
export type View = { kind: 'start' } | { kind: 'preset'; id: string } | { kind: 'custom' } | { kind: 'checkpoint'; key: string }

export const viewValue = (view: View): string => (view.kind === 'preset' ? `p:${view.id}` : view.kind === 'checkpoint' ? `c:${view.key}` : view.kind)
export const parseView = (value: string): View => (value.startsWith('p:') ? { kind: 'preset', id: value.slice(2) } : value.startsWith('c:') ? { kind: 'checkpoint', key: value.slice(2) } : value === 'custom' ? { kind: 'custom' } : { kind: 'start' })

interface Props {
  presets: ScenePreset[]
  checkpoints: Fixture[]
  view: View
  onChange: (view: View) => void
}

export default function PresetPicker({ presets, checkpoints, view, onChange }: Props) {
  return (
    <select className={styles.select} value={viewValue(view)} onChange={e => onChange(parseView(e.target.value))} aria-label="Preset" title="Which setup of this scene to show" data-testid="preset-select">
      <option value="start">Start</option>
      {presets.map(p => <option key={p.id} value={`p:${p.id}`}>{p.name}</option>)}
      {view.kind === 'custom' && <option value="custom">Custom</option>}
      {checkpoints.length > 0 && (
        <optgroup label="Game checkpoints (carry the campaign)">
          {checkpoints.map(f => <option key={f.key} value={`c:${f.key}`} title={f.hint}>{f.label}{f.group && f.group !== 'Curated' ? ` (${f.group})` : ''}</option>)}
        </optgroup>
      )}
    </select>
  )
}
