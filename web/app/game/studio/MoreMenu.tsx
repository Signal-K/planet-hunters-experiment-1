'use client'

import { useEffect, useRef, useState } from 'react'
import styles from './Studio.module.css'
import { usePopoverSide } from './usePopoverSide'

interface Props {
  theme: 'auto' | 'light' | 'dark'
  onTheme: (theme: 'auto' | 'light' | 'dark') => void
  showNative: boolean
  canNative: boolean
  onNative: () => void
  openHref: string | null
}

/** The rarely used controls, out of the way. */
export default function MoreMenu({ theme, onTheme, showNative, canNative, onNative, openHref }: Props) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const { side, style } = usePopoverSide(open, ref)
  // Inside Cursor's built-in browser the page is in a sandboxed frame that blocks new tabs, so a link there has to go in place.
  const framed = typeof window !== 'undefined' && window.self !== window.top
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
      <button type="button" className={`${styles.btn} ${styles.btnQuiet}`} onClick={() => setOpen(o => !o)} aria-expanded={open} data-testid="more">More ▾</button>
      {open && (
        <div className={`${styles.popover} ${styles.menu}`} data-side={side} style={style}>
          <div className={styles.group}>Theme</div>
          <span className={styles.seg} role="group" aria-label="Theme" style={{ margin: '0 8px 8px' }}>
            {(['auto', 'light', 'dark'] as const).map(t => <button key={t} type="button" aria-pressed={theme === t} onClick={() => onTheme(t)} data-testid={`theme-${t}`}>{t[0].toUpperCase() + t.slice(1)}</button>)}
          </span>
          {canNative && <button type="button" className={styles.row} onClick={() => { onNative(); setOpen(false) }} data-testid="toggle-native">{showNative ? 'Hide native snapshot' : 'Show native snapshot'}</button>}
          {openHref && <a className={styles.row} href={openHref} {...(framed ? {} : { target: '_blank', rel: 'noreferrer' })}>Open this scene on its own</a>}
          <a className={styles.row} href="/game/storyboard">Storyboard (every scene, native beside web)</a>
        </div>
      )}
    </div>
  )
}
