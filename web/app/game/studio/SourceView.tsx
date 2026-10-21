'use client'

import { useState } from 'react'
import type { DocBundle } from '@/lib/authoring/studio-types'
import type { Diagnostic } from '@/lib/authoring/validate'
import styles from './Studio.module.css'

interface Props {
  docs: { label: string; doc: DocBundle }[]
  hostRoot?: string
  onJump: (file: string, line: number) => void
}

/** The TOML exactly as it is on disk, with each problem marked on its line. Edit it in the code editor. */
export default function SourceView({ docs, hostRoot, onJump }: Props) {
  const [which, setWhich] = useState(0)
  if (!docs.length) return null
  const entry = docs[Math.min(which, docs.length - 1)]
  const byLine = new Map<number, Diagnostic>()
  for (const d of entry.doc.diagnostics) if (!byLine.has(d.line) || d.severity === 'error') byLine.set(d.line, d)
  return (
    <div data-testid="source-panel">
      <div className={styles.line} style={{ marginBottom: 8 }}>
        {docs.length > 1 && (
          <span className={styles.seg}>{docs.map((d, i) => <button key={d.doc.file} type="button" aria-pressed={i === which} onClick={() => setWhich(i)}>{d.label}</button>)}</span>
        )}
        <span className={styles.muted}>{entry.doc.file}{!entry.doc.exists && ' (not created yet)'}</span>
        {hostRoot && <a className={`${styles.btn} ${styles.btnQuiet}`} href={`cursor://file${hostRoot.startsWith('/') ? '' : '/'}${hostRoot}/${entry.doc.file}`}>Open in Cursor</a>}
      </div>
      {entry.doc.diagnostics.map((d, i) => (
        <button key={i} type="button" className={`${styles.diag} ${d.severity === 'warning' ? styles.diagWarn : ''}`} onClick={() => onJump(d.file, d.line)} data-testid="diagnostic">
          <strong>{d.line}:{d.column}</strong><span>{d.message}</span>
        </button>
      ))}
      <div className={styles.source}>
        {entry.doc.text.split('\n').map((line, i) => {
          const d = byLine.get(i + 1)
          return (
            <div key={i} id={`src-${entry.doc.file}-${i + 1}`} className={`${styles.srcLine} ${d ? (d.severity === 'error' ? styles.srcErr : styles.srcWarn) : ''}`} title={d?.message}>
              <span className={styles.srcNum}>{i + 1}</span>
              <span>{line || ' '}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
