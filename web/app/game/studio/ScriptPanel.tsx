'use client'

import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import FileList from './FileList'
import type { ScriptFile } from './FileList'
import styles from './Studio.module.css'

interface Props {
  files: ScriptFile[]
  hostRoot?: string
  /** Plain-language notes every agent reads. Left out for data files, which have none. */
  notes?: { always: string; next: string }
  onNote?: (which: 'always' | 'next', text: string) => void
  onPromote?: () => void
  /** Scene objects can be drawn and moved on the preview. Left out for data files, which are always edited. */
  editing?: boolean
  onEditing?: (on: boolean) => void
  problems: number
  /** The inspector, shown while editing. */
  inspector: ReactNode
  /** The script text with its problems marked. */
  source: ReactNode
}

/** The script behind the scene: open it in the editor, write notes for agents, edit its objects, read its source. */
export default function ScriptPanel(p: Props) {
  const [rules, setRules] = useState({ always: p.notes?.always ?? '', next: p.notes?.next ?? '' })
  const timers = useRef<Partial<Record<'always' | 'next', ReturnType<typeof setTimeout>>>>({})
  useEffect(() => setRules({ always: p.notes?.always ?? '', next: p.notes?.next ?? '' }), [p.notes?.always, p.notes?.next])
  const edit = (which: 'always' | 'next', text: string) => {
    setRules(r => ({ ...r, [which]: text }))
    clearTimeout(timers.current[which])
    timers.current[which] = setTimeout(() => p.onNote?.(which, text), 600)
  }
  const showInspector = p.editing !== false

  return (
    <div className={styles.stack} data-testid="script-panel">
      <section className={styles.card}>
        <h2 className={styles.cardTitle}>Open in your editor</h2>
        <FileList files={p.files} hostRoot={p.hostRoot} />
      </section>

      {p.notes && p.onNote && (
        <section className={styles.card}>
          <h2 className={styles.cardTitle}>Instructions for agents</h2>
          <p className={styles.hint}>Always: rules that stay true for this scene. Every agent reads them.</p>
          <textarea className={styles.input} value={rules.always} onChange={e => edit('always', e.target.value)} data-testid="notes-always" placeholder="Rules that stay true." />
          <p className={styles.hint} style={{ marginTop: 12 }}>Next pass: what the next agent should do.</p>
          <textarea className={styles.input} value={rules.next} onChange={e => edit('next', e.target.value)} data-testid="notes-next" placeholder="What to do next." />
          <div style={{ marginTop: 8 }}><button type="button" className={styles.btn} disabled={!rules.next.trim()} onClick={p.onPromote}>Move next pass to rules</button></div>
        </section>
      )}

      {p.onEditing && (
        <div className={styles.line}>
          <button type="button" className={`${styles.btn} ${p.editing ? styles.btnPrimary : ''}`} aria-pressed={!!p.editing} onClick={() => p.onEditing?.(!p.editing)} data-testid="edit-objects">{p.editing ? 'Editing objects on the preview' : 'Edit objects'}</button>
          <span className={styles.muted}>Draw UI elements and move things on the preview.</span>
        </div>
      )}

      {showInspector && p.inspector}

      <section className={styles.card}>
        <details data-testid="source-details" open={p.problems > 0}>
          <summary>Source{p.problems ? ` (${p.problems} problem${p.problems === 1 ? '' : 's'})` : ''}</summary>
          <div className={styles.body}>{p.source}</div>
        </details>
      </section>
    </div>
  )
}
