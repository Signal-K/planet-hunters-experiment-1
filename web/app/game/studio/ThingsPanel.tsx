'use client'

import { useEffect, useState } from 'react'
import type { ScenePreset, Thing } from '@/lib/authoring/docs'
import { groupThings } from '@/lib/authoring/things'
import type { Selection } from '@/lib/authoring/things'
import styles from './Studio.module.css'

interface Props {
  things: Thing[]
  /** What the picker says: a preset's name, "Start" or "Custom". */
  title: string
  /** The saved preset the picker is on, or null for the scene's start or a setup nobody has saved. */
  base: ScenePreset | null
  /** The things have moved off the preset since it was chosen. */
  dirty: boolean
  selection: Selection
  onToggle: (id: string) => void
  onValue: (id: string, value: number) => void
  onReset: () => void
  onSave: (name: string, instructions: string) => void
  onUpdate: () => void
  onInstructions: (text: string) => void
  /** Opens the scene script at its things, or null when the repo path is not known. */
  scriptHref: string | null
}

/** Everything that can be in this scene. Bring things in, see them in the real game, and save the combination as a preset. */
export default function ThingsPanel(p: Props) {
  const [saving, setSaving] = useState(false)
  const [name, setName] = useState('')
  const [draft, setDraft] = useState('')
  const [text, setText] = useState(p.base?.instructions ?? '')
  useEffect(() => setText(p.base?.instructions ?? ''), [p.base?.id, p.base?.instructions])
  useEffect(() => { if (p.base) setSaving(false) }, [p.base?.id, p.base])

  if (!p.things.length) {
    return (
      <section className={styles.card} data-testid="things-empty">
        <h2 className={styles.cardTitle}>Nothing listed yet</h2>
        <p className={styles.hint}>
          A scene script lists everything that can be in the scene as <code>[[things]]</code>. Add some and they appear here to switch on, and to save as presets.
        </p>
        {p.scriptHref && <a className={styles.btn} href={p.scriptHref}>Open the script</a>}
      </section>
    )
  }

  const groups = groupThings(p.things)
  const save = () => {
    const clean = name.trim()
    if (!clean) return
    p.onSave(clean, draft.trim())
    setName(''); setDraft('')
  }

  return (
    <div className={styles.stack} data-testid="things-panel">
      <section className={styles.card}>
        <div className={styles.presetRow}>
          <strong data-testid="preset-name">{p.title}{p.dirty ? ' (changed)' : ''}</strong>
          <span className={styles.badges}>
            {p.dirty && p.base && <button type="button" className={styles.btn} onClick={p.onUpdate} data-testid="preset-update">Save changes</button>}
            <button type="button" className={styles.btn} onClick={p.onReset} data-testid="things-reset" title="Back to the preset's things, or the scene's starting point">Reset</button>
          </span>
        </div>
        {p.base ? (
          <>
            <p className={styles.hint} style={{ margin: '8px 0 4px' }}>What to try, what should happen, what must not. Agents treat this as the test for this setup.</p>
            <textarea
              className={`${styles.input} ${styles.instructions}`}
              data-testid="preset-instructions"
              value={text}
              placeholder="Write it the way you would say it out loud."
              onChange={e => setText(e.target.value)}
              onBlur={() => { if (text !== (p.base?.instructions ?? '')) p.onInstructions(text) }}
            />
          </>
        ) : (
          <p className={styles.hint} style={{ margin: '8px 0 0' }}>Not saved yet. Switch things on, then save the setup with instructions of what to try.</p>
        )}
      </section>

      <section className={styles.card}>
        <div className={styles.things}>
          {groups.map(group => (
            <div key={group.name}>
              <div className={styles.thingGroup}>{group.name}</div>
              <div className={styles.thingRow}>
                {group.items.map(thing => thing.range ? null : (
                  <button key={thing.id} type="button" className={styles.thing} aria-pressed={p.selection.on.includes(thing.id)} title={thing.note} data-testid={`thing-${thing.id}`} onClick={() => p.onToggle(thing.id)}>
                    {thing.label}
                  </button>
                ))}
              </div>
              {group.items.filter(thing => thing.range).map(thing => {
                const range = thing.range!
                const value = p.selection.values[thing.id] ?? range.value
                return (
                  <div key={thing.id} className={styles.slider}>
                    <label htmlFor={`slider-${thing.id}`}>{thing.label}</label>
                    <span className={styles.muted} data-testid={`value-${thing.id}`}>{value}</span>
                    <input id={`slider-${thing.id}`} type="range" min={range.min} max={range.max} step={range.step ?? 1} value={value} data-testid={`slider-${thing.id}`}
                      onChange={e => p.onValue(thing.id, Number(e.target.value))} />
                  </div>
                )
              })}
              {group.items.some(thing => thing.note && p.selection.on.includes(thing.id)) && (
                <p className={styles.thingNote}>{group.items.filter(thing => thing.note && p.selection.on.includes(thing.id)).map(thing => thing.note).join(' ')}</p>
              )}
            </div>
          ))}
        </div>
      </section>

      {saving ? (
        <section className={styles.saveForm} data-testid="save-form">
          <input autoFocus className={styles.input} placeholder="Name this preset" value={name} onChange={e => setName(e.target.value)} data-testid="preset-new-name"
            onKeyDown={e => { if (e.key === 'Enter') save(); if (e.key === 'Escape') setSaving(false) }} />
          <textarea className={`${styles.input} ${styles.instructions}`} placeholder="What to try, what should happen, what must not (optional)" value={draft} onChange={e => setDraft(e.target.value)} data-testid="preset-new-instructions" />
          <div className={styles.line}>
            <button type="button" className={`${styles.btn} ${styles.btnPrimary}`} onClick={save} disabled={!name.trim()} data-testid="preset-save">Save preset</button>
            <button type="button" className={`${styles.btn} ${styles.btnQuiet}`} onClick={() => setSaving(false)}>Cancel</button>
          </div>
        </section>
      ) : (
        <div className={styles.line}>
          <button type="button" className={styles.btn} onClick={() => setSaving(true)} data-testid="preset-save-as">Save as preset</button>
          {p.scriptHref && <a className={`${styles.btn} ${styles.btnQuiet}`} href={p.scriptHref} data-testid="things-script">Edit things in the script</a>}
        </div>
      )}
    </div>
  )
}
