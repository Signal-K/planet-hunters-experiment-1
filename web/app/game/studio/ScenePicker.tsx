'use client'

import { useEffect, useRef, useState } from 'react'
import type { StudioIndex } from '@/lib/authoring/studio-types'
import styles from './Studio.module.css'

const TYPES: [string, string][] = [['base', 'Base'], ['travel', 'Travel'], ['field', 'Field'], ['build', 'Build'], ['exchange-lab', 'Exchange and lab'], ['menu', 'Menus and records']]

interface Props {
  index: StudioIndex
  label: string
  currentId: string
  focusIds: string[]
  open: boolean
  onOpen: (open: boolean) => void
  onPickScene: (id: string) => void
  onPickFlow: (id: string) => void
  onPickData: (kind: 'world' | 'mission', id: string) => void
}

/** One button that opens a searchable list of every scene. Replaces a permanent sidebar so the page can use the full width. */
export default function ScenePicker({ index, label, currentId, focusIds, open, onOpen, onPickScene, onPickFlow, onPickData }: Props) {
  const [q, setQ] = useState('')
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    setQ('')
    const away = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) onOpen(false) }
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape') onOpen(false) }
    document.addEventListener('mousedown', away)
    document.addEventListener('keydown', key)
    return () => { document.removeEventListener('mousedown', away); document.removeEventListener('keydown', key) }
  }, [open, onOpen])

  const needle = q.trim().toLowerCase()
  const match = (parts: string[]) => !needle || parts.some(p => p.toLowerCase().includes(needle))

  return (
    <div className={styles.anchor} ref={ref}>
      <button type="button" className={styles.btn} onClick={() => onOpen(!open)} aria-expanded={open} aria-haspopup="listbox" data-testid="scene-picker" title="Choose a scene (Ctrl or Cmd + K)">
        <strong>{label}</strong> <span className={styles.muted}>▾</span>
      </button>
      {open && (
        <div className={styles.popover} role="listbox" data-testid="scene-list">
          <input autoFocus className={styles.input} placeholder="Find a scene or ticket" value={q} onChange={e => setQ(e.target.value)} data-testid="scene-filter"
            onKeyDown={e => { if (e.key === 'Enter') { const first = index.scenes.find(s => match([s.id, s.name, ...s.tickets])); if (first) onPickScene(first.id) } }} />
          {index.flows.some(f => match([f.id, f.name, f.summary])) && <div className={styles.group}>Missions</div>}
          {index.flows.filter(f => match([f.id, f.name, f.summary])).map(f => (
            <button key={f.id} type="button" className={styles.row} onClick={() => onPickFlow(f.id)} data-testid={`flow-${f.id}`} title={f.summary}>
              <span>{f.name}</span>
              <span className={styles.badges}><span className={styles.tag}>{f.steps.length} steps</span>{f.errors > 0 && <span className={`${styles.tag} ${styles.tagWrong}`}>!</span>}</span>
            </button>
          ))}
          {TYPES.map(([type, name]) => {
            const scenes = index.scenes.filter(s => s.type === type && match([s.id, s.name, ...s.tickets]))
            if (!scenes.length) return null
            return (
              <div key={type}>
                <div className={styles.group}>{name}</div>
                {scenes.map(s => (
                  <button key={s.id} type="button" role="option" aria-selected={s.id === currentId} className={`${styles.row} ${s.id === currentId ? styles.rowOn : ''}`} onClick={() => onPickScene(s.id)} data-testid={`scene-${s.id}`}>
                    <span>{s.name}</span>
                    <span className={styles.badges}>
                      {focusIds.includes(s.id) && <span className={`${styles.tag} ${styles.tagNow}`}>working</span>}
                      {s.feedback.unresolved > 0 && <span className={`${styles.tag} ${styles.tagWrong}`} title="Open notes">{s.feedback.unresolved}</span>}
                      {s.errors > 0 && <span className={`${styles.tag} ${styles.tagWrong}`} title="Problems in the script">!</span>}
                    </span>
                  </button>
                ))}
              </div>
            )
          })}
          {index.data.some(d => match([d.id, d.title])) && <div className={styles.group}>Data</div>}
          {index.data.filter(d => match([d.id, d.title])).map(d => (
            <button key={`${d.kind}:${d.id}`} type="button" className={styles.row} onClick={() => onPickData(d.kind, d.id)} data-testid={`data-${d.id}`}>
              <span>{d.kind === 'world' ? 'World' : 'Mission'}: {d.kind === 'mission' ? d.title : d.id}</span>
              {d.errors > 0 && <span className={styles.badges}><span className={`${styles.tag} ${styles.tagWrong}`}>!</span></span>}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
