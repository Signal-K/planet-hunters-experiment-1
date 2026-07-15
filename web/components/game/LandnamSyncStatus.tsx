'use client'

import { useEffect, useState } from 'react'
import { useGame } from '@/game-context'
import { UI_ZONES } from '@/lib/ui-zones'

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
  useEffect(() => setMounted(true), [])

  if (!mounted || !game.authUserId || game.landnamSynced) return null

  return (
    <div data-ui-zone={UI_ZONES.statusUtility} className="sync-status" title="Progress is saved on this device only until this reconnects">
      <span aria-hidden="true" />
      NOT SYNCED
    </div>
  )
}
