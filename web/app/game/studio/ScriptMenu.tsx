'use client'

import { useEffect, useRef, useState } from 'react'
import FileList from './FileList'
import type { ScriptFile } from './FileList'
import styles from './Studio.module.css'

interface Props {
  files: ScriptFile[]
  hostRoot?: string
}

/** One button in the bar that opens the scene's script (and its notes) in the editor. */
export default function ScriptMenu({ files, hostRoot }: Props) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const away = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false) }
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', away)
    document.addEventListener('keydown', key)
    return () => { document.removeEventListener('mousedown', away); document.removeEventListener('keydown', key) }
  }, [open])
  return (
    <div className={styles.anchor} ref={ref}>
      <button type="button" className={styles.btn} onClick={() => setOpen(o => !o)} aria-expanded={open} data-testid="script-menu" title="Open the script in your editor">Script ▾</button>
      {open && (
        <div className={`${styles.popover} ${styles.menu}`} style={{ padding: '4px 16px 12px' }}>
          <div className={styles.group} style={{ padding: '12px 0 0' }}>Open in your editor</div>
          <FileList files={files} hostRoot={hostRoot} />
        </div>
      )}
    </div>
  )
}
