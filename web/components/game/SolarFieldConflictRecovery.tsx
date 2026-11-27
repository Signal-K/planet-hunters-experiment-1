'use client'

import { useEffect, useState } from 'react'
import { getSolarFieldOutbox } from '@/lib/offline/pbOutbox'
import type { OutboxItem } from '@/lib/offline/outbox'
import { pbLandnam } from '@/lib/pb-landnam'
import { hasSolarFieldConflict, queuedSolarField, validAccountSolarField } from '@/lib/takeon/solarFieldRecovery'
import styles from './SolarFieldConflictRecovery.module.css'

/** Never merges competing terrain/cargo snapshots. A player can back up their
 * device's queued copies and deliberately resume the copy on their account. */
export default function SolarFieldConflictRecovery({ site, onBeforeResolve, onResolved }: { site: string; onBeforeResolve: () => Promise<void>; onResolved: () => void }) {
  const [items, setItems] = useState<OutboxItem[]>([])
  const [backedUp, setBackedUp] = useState<string[]>([])
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  useEffect(() => {
    let active = true
    const box = getSolarFieldOutbox()
    const refresh = async () => {
      const user = pbLandnam.authStore.record?.id
      if (!user) return
      try {
        await box.has(op => op.type === 'solar-field' && op.user === user && op.site === site)
        if (active) setItems(queuedSolarField(box.pending(), user, site))
      } catch { if (active) setMessage('Could not read this device’s saved field. Your changes have not been removed.') }
    }
    void refresh()
    // A coordinated read emits a queue update itself; subscribing and then
    // refreshing from that notification would create an endless read loop.
    const timer = window.setInterval(() => { void refresh() }, 5_000)
    return () => { active = false; window.clearInterval(timer) }
  }, [site])
  if (!hasSolarFieldConflict(items)) return null

  const download = () => {
    const user = pbLandnam.authStore.record?.id
    if (!user) return
    const queued = queuedSolarField(items, user, site)
    if (!queued.length) return
    const file = new Blob([JSON.stringify({ format: 'landnam-solar-field-backup', version: 1, site, user, savedAt: new Date().toISOString(), items: queued }, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(file)
    const link = document.createElement('a')
    link.href = url
    link.download = `${site.replaceAll(':', '-')}-field-backup.json`
    link.click()
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000)
    setBackedUp(queued.map(item => item.id))
    setMessage('Download started. Keep this backup before choosing the account copy.')
  }
  const useAccount = async () => {
    const user = pbLandnam.authStore.record?.id
    if (!user || !backedUp.length) return
    setBusy(true)
    setMessage('')
    try {
      const result = await pbLandnam.send<{ revision: number; state: { id?: string; coreSnapshot?: string } | null }>('/api/solar-fields', { query: { site } })
      if (pbLandnam.authStore.record?.id !== user || !validAccountSolarField(result, site)) throw new Error('The account field could not be verified. Reconnect and try again.')
      // The live game must stop issuing new writes before the backed-up queue
      // is removed, including the save normally performed on unmount.
      await onBeforeResolve()
      const discarded = await getSolarFieldOutbox().discardIfUnchanged(
        op => op.type === 'solar-field' && op.user === user && op.site === site,
        backedUp,
      )
      if (!discarded) {
        setBackedUp([])
        throw new Error('The local field changed after the backup. Download it again before choosing the account copy.')
      }
      if (pbLandnam.authStore.record?.id !== user) throw new Error('The signed-in account changed. Reopen the field under the original account.')
      onResolved()
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not switch to the account field. Your local changes remain on this device.')
    } finally { setBusy(false) }
  }
  return <section className={styles.recovery} role="alert" aria-label="Field save conflict">
    <p>This field changed on another device. Both copies are different, so they cannot be combined automatically.</p>
    <p>Download this device’s changes first. Choosing the account copy removes the downloaded changes from this device’s upload queue; it does not add them to your account.</p>
    <div className={styles.actions}>
      <button type="button" onClick={download} disabled={busy}>Download local backup</button>
      <button type="button" onClick={() => void useAccount()} disabled={busy || !backedUp.length}>{busy ? 'Checking account…' : 'Use account copy'}</button>
    </div>
    {message && <p>{message}</p>}
  </section>
}
