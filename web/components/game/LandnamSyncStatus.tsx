'use client'

import { useEffect, useState } from 'react'
import { useGame } from '@/game-context'
import { UI_ZONES } from '@/lib/ui-zones'
import { getOutbox } from '@/lib/offline/pbOutbox'
import type { OutboxSnapshot } from '@/lib/offline/outbox'

export function syncLabel(landnamSynced: boolean, outbox: OutboxSnapshot): string | null {
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
  useEffect(() => {
    const box = getOutbox()
    const unsubscribe = box.subscribe(setOutbox)
    const stop = box.start()
    return () => { unsubscribe(); stop() }
  }, [])

  const label = syncLabel(game.landnamSynced, outbox)
  if (!mounted || !game.authUserId || !label) return null

  return (
    <div data-ui-zone={UI_ZONES.statusUtility} className="sync-status" title="Progress is saved on this device and uploads when this reconnects">
      <span aria-hidden="true" />
      {label}
    </div>
  )
}
