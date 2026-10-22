'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useGame } from '@/game-context'
import { UI_ZONES } from '@/lib/ui-zones'
import { getOutbox } from '@/lib/offline/pbOutbox'
import type { OutboxSnapshot } from '@/lib/offline/outbox'

export function syncLabel(landnamSynced: boolean, outbox: OutboxSnapshot, online = true): string | null {
  // Offline play keeps going on the local cache; the outbox replays on reconnect (SSL-554).
  if (!online) return outbox.waiting > 0 ? `OFFLINE · ${outbox.waiting}` : 'OFFLINE'
  if (outbox.flushing && outbox.waiting > 0) return 'UPLOADING…'
  if (outbox.waiting > 0) return `${outbox.waiting} ${outbox.waiting === 1 ? 'CHANGE' : 'CHANGES'} WAITING`
  if (outbox.failed > 0 || !landnamSynced) return 'NOT SYNCED'
  return null
}

// Persistent indicator for whether this device's guest/account identity has
// been mirrored onto Landnam's own PocketBase (see landnam_auth.go's
// exchange endpoint and useAuthSync.ts's background re-sync loop). Replaces
// the old one-shot "Offline mode" toast as the primary signal — a toast
// disappears and is easy to miss, but an unsynced session silently loses
// its ability to persist progress server-side for as long as it stays
// unsynced, so this stays visible the whole time rather than firing once.
export default function LandnamSyncStatus() {
  const game = useGame()
  // pbShared's authStore initializes synchronously from localStorage, so a
  // returning player with a stored session already has authUserId set on
  // the very first client render — before the server (which never sees
  // localStorage) rendered anything here. Deferring to post-mount keeps the
  // hydration pass itself always null on both sides; only fine to differ
  // once React is done reconciling.
  const [mounted, setMounted] = useState(false)
  const [outbox, setOutbox] = useState<OutboxSnapshot>({ waiting: 0, failed: 0, flushing: false })
  useEffect(() => setMounted(true), [])
  const [online, setOnline] = useState(true)
  useEffect(() => {
    const update = () => setOnline(navigator.onLine)
    update()
    window.addEventListener('online', update)
    window.addEventListener('offline', update)
    return () => { window.removeEventListener('online', update); window.removeEventListener('offline', update) }
  }, [])
  useEffect(() => {
    const box = getOutbox()
    const unsubscribe = box.subscribe(setOutbox)
    const stop = box.start()
    return () => { unsubscribe(); stop() }
  }, [])

  const label = syncLabel(game.landnamSynced, outbox, online)
  const host = useChipSlot(mounted && !!game.authUserId && !!label)
  if (!mounted || !game.authUserId || !label) return null

  const chip = (
    <span
      data-ui-zone={UI_ZONES.statusUtility}
      data-testid="sync-chip"
      className={host ? 'scene-chip sync-chip' : 'scene-chip sync-chip sync-chip--floating'}
      data-offline={online ? undefined : 'true'}
      title="Progress is saved on this device and uploads when this reconnects"
      aria-label={String(label)}
    >
      <span aria-hidden="true" className="sync-chip__dot" />
      <span className="sync-chip__label" style={{ display: 'inline' }}>{label}</span>
    </span>
  )
  return host ? createPortal(chip, host) : chip
}

/**
 * SSL-559: the chip sits in the screen's own top-right chip row, just left of the
 * francs chip (same place as native), in every layout. Screens own that row, so
 * this keeps a slot element in front of whichever francs chip is on screen and
 * follows route changes; with no chip row it floats top-right.
 */
function useChipSlot(active: boolean): HTMLElement | null {
  const [host, setHost] = useState<HTMLElement | null>(null)
  useEffect(() => {
    if (!active) { setHost(null); return }
    let frame = 0
    const place = () => {
      frame = 0
      const francs = Array.from(document.querySelectorAll<HTMLElement>('[data-testid$="-francs-chip"], .top-bar .scene-chip'))
        .find(el => el.offsetParent !== null)
      let slot = document.querySelector<HTMLElement>('[data-sync-slot]')
      if (!francs) { slot?.remove(); setHost(null); return }
      if (!slot) { slot = document.createElement('span'); slot.setAttribute('data-sync-slot', ''); slot.style.display = 'contents' }
      if (slot.nextElementSibling !== francs) francs.parentElement?.insertBefore(slot, francs)
      setHost(current => current === slot ? current : slot)
      publishRowInset(francs.parentElement, sizes)
    }
    const sizes = new ResizeObserver(() => { if (!frame) frame = requestAnimationFrame(place) })
    place()
    const observer = new MutationObserver(() => { if (!frame) frame = requestAnimationFrame(place) })
    observer.observe(document.body, { childList: true, subtree: true })
    const onResize = () => { if (!frame) frame = requestAnimationFrame(place) }
    window.addEventListener('resize', onResize)
    return () => {
      observer.disconnect(); sizes.disconnect(); window.removeEventListener('resize', onResize)
      if (frame) cancelAnimationFrame(frame)
      document.querySelector('[data-sync-slot]')?.remove()
      document.documentElement.style.removeProperty('--top-chip-inset')
    }
  }, [active])
  return host
}

/** SSL-655: the OPS coach strip starts after the real top chip row (it grows when the sync chip shows), not at a fixed 200px. */
function publishRowInset(row: HTMLElement | null, sizes: ResizeObserver) {
  if (!row) return
  const chips = Array.from(row.querySelectorAll<HTMLElement>('.scene-chip'))
  chips.forEach(el => sizes.observe(el))
  const rights = chips
    .map(el => el.getBoundingClientRect())
    .filter(r => r.width > 0 && r.left < window.innerWidth / 2)
    .map(r => r.right)
  if (!rights.length) return
  document.documentElement.style.setProperty('--top-chip-inset', `${Math.ceil(Math.max(...rights)) + 8}px`)
}
