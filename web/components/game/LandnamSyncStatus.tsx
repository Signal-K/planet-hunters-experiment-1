'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useGame } from '@/game-context'
import { UI_ZONES } from '@/lib/ui-zones'
import { getOutbox } from '@/lib/offline/pbOutbox'
import type { OutboxSnapshot } from '@/lib/offline/outbox'
import { syncState } from '@/lib/offline/syncTray'
import SyncTray from './SyncTray'

const LAST_UPLOAD_KEY = 'ln-last-upload'

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
/** `preview`: the account-free stage shows the chip with `?signed=1` so its place on a scene can be checked (SSL-748). */
export default function LandnamSyncStatus({ preview = false }: { preview?: boolean } = {}) {
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
  // SSL-729: the last time the queue emptied while online, so the tray can say when progress last reached the account.
  const [lastUpload, setLastUpload] = useState<number | null>(null)
  useEffect(() => {
    try { const v = Number(window.localStorage.getItem(LAST_UPLOAD_KEY)); if (v > 0) setLastUpload(v) } catch { /* private mode */ }
  }, [])
  const [hadWaiting, setHadWaiting] = useState(false)
  useEffect(() => {
    if (outbox.waiting > 0) { setHadWaiting(true); return }
    if (!hadWaiting || !online || outbox.flushing || outbox.failed > 0) return
    const at = Date.now()
    setHadWaiting(false)
    setLastUpload(at)
    try { window.localStorage.setItem(LAST_UPLOAD_KEY, String(at)) } catch { /* private mode */ }
  }, [outbox, online, hadWaiting])
  useEffect(() => {
    const box = getOutbox()
    const unsubscribe = box.subscribe(setOutbox)
    const stop = box.start()
    return () => { unsubscribe(); stop() }
  }, [])
  const [trayOpen, setTrayOpen] = useState(false)
  const [anchor, setAnchor] = useState<{ left: number; bottom: number } | null>(null)

  useTopChipInset()
  // SSL-729: the chip always shows for a signed-in player, so "synced" is something you can see and tap.
  const label = syncLabel(game.landnamSynced, outbox, online) ?? 'SYNCED'
  const state = syncState(game.landnamSynced, outbox, online)
  const signedIn = preview || !!game.authUserId
  const host = useChipSlot(mounted && signedIn)
  if (!mounted || !signedIn) return null

  const chip = (
    <button
      type="button"
      data-ui-zone={UI_ZONES.statusUtility}
      data-testid="sync-chip"
      className={host ? 'scene-chip sync-chip' : 'scene-chip sync-chip sync-chip--floating'}
      data-offline={online ? undefined : 'true'}
      data-state={state}
      aria-expanded={trayOpen}
      aria-label={`${label}. Open sync details`}
      onClick={event => { const r = event.currentTarget.getBoundingClientRect(); setAnchor({ left: r.left, bottom: r.bottom }); setTrayOpen(open => !open) }}
    >
      <span aria-hidden="true" className="sync-chip__dot" />
      <span className="sync-chip__label" style={{ display: 'inline' }}>{label}</span>
    </button>
  )
  return (
    <>
      {host ? createPortal(chip, host) : chip}
      {trayOpen && <SyncTray state={state} outbox={outbox} box={getOutbox()} lastUpload={lastUpload} online={online} anchor={anchor} onClose={() => setTrayOpen(false)} />}
    </>
  )
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
      const visible = (el: HTMLElement) => el.offsetParent !== null
      const francs = Array.from(document.querySelectorAll<HTMLElement>('[data-testid$="-francs-chip"], .top-bar .scene-chip:not(.sync-chip)')).find(visible)
      // SSL-748: screens with no francs chip (control station, launch pad, consoles) keep their own controls in the
      // top-right corner, so a fixed floating chip covered them. Join the screen's own top row beside its help button.
      // SSL-828: never anchor inside the slot itself (the chip it holds would become its own anchor).
      const anchor = francs ?? Array.from(document.querySelectorAll<HTMLElement>('[data-sync-anchor], [data-testid="help-button"]')).find(visible)
      let slot = document.querySelector<HTMLElement>('[data-sync-slot]')
      if (!anchor) { slot?.remove(); setHost(null); return }
      if (!slot) { slot = document.createElement('span'); slot.setAttribute('data-sync-slot', ''); slot.style.display = 'contents' }
      if (slot.nextElementSibling !== anchor) anchor.parentElement?.insertBefore(slot, anchor)
      setHost(current => current === slot ? current : slot)
    }
    place()
    const observer = new MutationObserver(() => { if (!frame) frame = requestAnimationFrame(place) })
    observer.observe(document.body, { childList: true, subtree: true })
    const onResize = () => { if (!frame) frame = requestAnimationFrame(place) }
    window.addEventListener('resize', onResize)
    return () => {
      observer.disconnect(); window.removeEventListener('resize', onResize)
      if (frame) cancelAnimationFrame(frame)
      document.querySelector('[data-sync-slot]')?.remove()
    }
  }, [active])
  return host
}

/**
 * SSL-655: the OPS coach strip starts after the real top chip row, not at a fixed 200px. The row grows with the
 * sync chip, a two-digit Stash count or the dev badge, so this runs whether or not the sync chip is showing.
 */
function useTopChipInset() {
  useEffect(() => {
    let frame = 0
    const measure = () => {
      frame = 0
      const francs = Array.from(document.querySelectorAll<HTMLElement>('[data-testid$="-francs-chip"], .top-bar .scene-chip:not(.sync-chip)'))
        .find(el => el.offsetParent !== null)
      publishRowInset(francs?.parentElement ?? null, sizes)
    }
    const schedule = () => { if (!frame) frame = requestAnimationFrame(measure) }
    const sizes = new ResizeObserver(schedule)
    measure()
    const observer = new MutationObserver(schedule)
    observer.observe(document.body, { childList: true, subtree: true })
    window.addEventListener('resize', schedule)
    return () => {
      observer.disconnect(); sizes.disconnect(); window.removeEventListener('resize', schedule)
      if (frame) cancelAnimationFrame(frame)
      document.documentElement.style.removeProperty('--top-chip-inset')
    }
  }, [])
}

function publishRowInset(row: HTMLElement | null, sizes: ResizeObserver) {
  if (!row) { document.documentElement.style.removeProperty('--top-chip-inset'); return }
  const chips = Array.from(row.querySelectorAll<HTMLElement>('.scene-chip'))
  chips.forEach(el => sizes.observe(el))
  const rights = chips
    .map(el => el.getBoundingClientRect())
    .filter(r => r.width > 0 && r.left < window.innerWidth / 2)
    .map(r => r.right)
  if (!rights.length) return
  document.documentElement.style.setProperty('--top-chip-inset', `${Math.ceil(Math.max(...rights)) + 8}px`)
}
