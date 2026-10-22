'use client'

import { useState } from 'react'
import { scriptHref } from '@/lib/authoring/studio-model'
import styles from './Studio.module.css'

export interface ScriptFile {
  label: string
  /** Repo-relative path. */
  file: string
  /** Line to open at, when one is known. */
  line?: number
  /** The file does not exist yet; opening it in the editor creates it. */
  missing?: boolean
}

interface Props {
  files: ScriptFile[]
  /** Where the repo is on this machine. Without it the files can be named and copied but not opened. */
  hostRoot?: string
}

/** The files behind a scene: one click opens each in Cursor, at the right line. */
export default function FileList({ files, hostRoot }: Props) {
  const [copied, setCopied] = useState<string | null>(null)
  const copy = async (file: string) => {
    try { await navigator.clipboard.writeText(file); setCopied(file); setTimeout(() => setCopied(c => (c === file ? null : c)), 1600) } catch { /* clipboard blocked */ }
  }
  return (
    <div data-testid="file-list">
      {files.map(f => (
        <div key={`${f.file}:${f.line ?? ''}`} className={styles.file}>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div><strong>{f.label}</strong>{f.missing ? <span className={styles.muted}> (not created yet)</span> : null}</div>
            <div className={styles.filePath}>{f.file}{f.line ? `:${f.line}` : ''}</div>
          </div>
          {hostRoot && <a className={`${styles.btn} ${styles.btnPrimary}`} href={scriptHref(hostRoot, f.file, f.line)} data-testid={`open-${f.file.split('/').pop()}`}>Open in Cursor</a>}
          <button type="button" className={`${styles.btn} ${styles.btnQuiet}`} onClick={() => copy(f.file)}>{copied === f.file ? 'Copied' : 'Copy path'}</button>
        </div>
      ))}
      {!hostRoot && <p className={styles.hint} style={{ margin: '8px 0 0' }}>The repo path is not known here, so files cannot be opened from the Studio. Starting the stack with <code>make up</code> sets it. Meanwhile, copy a path and use Quick Open (Cmd+P).</p>}
    </div>
  )
}
