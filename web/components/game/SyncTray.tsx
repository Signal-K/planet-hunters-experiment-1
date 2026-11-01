'use client'

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type { Outbox, OutboxSnapshot } from '@/lib/offline/outbox'
import { ageLabel, describeChange, syncTrayCopy, type SyncState } from '@/lib/offline/syncTray'
import styles from './SyncTray.module.css'

const SHOWN = 6

/**
 * SSL-729: the sync tray. Opened from the sync chip, it says where progress is
 * right now (this device or the account), lists every change still waiting in
 * plain words, and offers an upload when there is a connection.
 */
export default function SyncTray({ state, outbox, box, lastUpload, online, anchor, onClose }: {
  state: SyncState
  outbox: OutboxSnapshot
  box: Outbox
  lastUpload: number | null
  online: boolean
  /** The chip's box: the tray opens just under it. */
  anchor: { left: number; bottom: number } | null
  onClose: () => void
}) {
  const [now, setNow] = useState(() => Date.now())
  // A tap on Upload now that could not reach the server says so, instead of doing nothing visible.
  const [unreachable, setUnreachable] = useState(false)
  const [trying, setTrying] = useState(false)
  useEffect(() => { const t = window.setInterval(() => setNow(Date.now()), 15_000); return () => window.clearInterval(t) }, [])
  // Not a modal: the scene stays live, and a tap anywhere outside (or Escape) folds the tray away.
  const trayRef = useRef<HTMLElement>(null)
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose() }
    const onPointer = (event: PointerEvent) => {
      const target = event.target as Node | null
      if (target && !trayRef.current?.contains(target) && !(target instanceof Element && target.closest('[data-testid="sync-chip"]'))) onClose()
    }
    window.addEventListener('keydown', onKey)
    window.addEventListener('pointerdown', onPointer)
    return () => { window.removeEventListener('keydown', onKey); window.removeEventListener('pointerdown', onPointer) }
  }, [onClose])
  const items = box.pending()
  const copy = syncTrayCopy(state, outbox.waiting)
  const canUpload = online && outbox.waiting > 0

  return createPortal(
      <section ref={trayRef} className={styles.tray} data-state={state} data-testid="sync-tray" role="region" aria-label="Sync"
        style={anchor ? { top: anchor.bottom + 8, left: `clamp(8px, ${Math.round(anchor.left)}px, calc(100vw - min(360px, 100vw - 16px) - 8px))` } : undefined}>
        <header className={styles.head}>
          <span className={styles.dot} aria-hidden="true" />
          <strong>{copy.title}</strong>
          <button type="button" className={styles.close} data-testid="sync-tray-close" onClick={onClose}>Close</button>
        </header>
        <p className={styles.body}>{copy.body}</p>
        {items.length > 0 && (
          <ul className={styles.list} data-testid="sync-tray-items">
            {items.slice(0, SHOWN).map(item => (
              <li key={item.id}>
                <span>{describeChange(item)}</span>
                <small>{item.failed ? 'Retrying' : ageLabel(item.createdAt, now)}</small>
              </li>
            ))}
            {items.length > SHOWN && <li><span>{items.length - SHOWN} more</span></li>}
          </ul>
        )}
        {lastUpload !== null && <p className={styles.meta}>Last upload {ageLabel(lastUpload, now)}</p>}
        {unreachable && outbox.waiting > 0 && <p className={styles.meta} data-testid="sync-tray-unreachable">Could not reach the server. Your changes stay on this device and upload by themselves when you reconnect.</p>}
        {canUpload && (
          <button type="button" className={styles.upload} data-testid="sync-tray-upload" disabled={trying} onClick={async () => {
            setUnreachable(false)
            setTrying(true)
            // A request to an unreachable server can hang; give it a few seconds, then say so.
            await Promise.race([box.flush().catch(() => {}), new Promise(resolve => window.setTimeout(resolve, 5_000))])
            setTrying(false)
            setUnreachable(box.snapshot().waiting > 0)
          }}>{trying ? 'Trying…' : 'Upload now'}</button>
        )}
      </section>,
    document.body,
  )
}
