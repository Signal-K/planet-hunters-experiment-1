'use client'

import { useCallback, useMemo, useRef, useState } from 'react'
import { defaultSpec, LocalSync, type MissionState } from '@takeon/engine'
import type { Target } from '@/lib/data'
import type { MissionZone } from '@/lib/data/mission-zone'
import TakeOnMount, { type TakeOnMountHandle } from '@/components/takeon/TakeOnMount'
import { takeonBodyForTarget } from '@/lib/takeon/bodies'
import { mineralFromSolarResource } from '@/lib/takeon/solarMining'
import { SolarFieldSync, solarFieldId } from '@/lib/takeon/SolarFieldSync'
import SolarFieldConflictRecovery from '@/components/game/SolarFieldConflictRecovery'
import styles from './SolarMiningPreview.module.css'

/** Isolated fixture storage; never reads or writes the player's local Takeon saves. */
function fixtureStorage(): Storage {
  const prefix = 'landnam-solar-mining-fixture-v2:'
  return {
    get length() { return 0 }, clear() {}, key() { return null },
    getItem(key) { return localStorage.getItem(prefix + key) },
    setItem(key, value) { localStorage.setItem(prefix + key, value) },
    removeItem(key) { localStorage.removeItem(prefix + key) },
  }
}

/** A reviewable, account-free field; mission payouts are intentionally not invoked here. */
export default function SolarMiningPreview({ target, zone, persistent = false, onPause, onComplete }: {
  target: Target; zone: MissionZone; persistent?: boolean; onPause?: () => void; onComplete?: (cargo: Record<string, number>) => void
}) {
  const rover = useMemo(() => defaultSpec(), [])
  const adapter = useMemo(() => persistent
    ? new SolarFieldSync()
    : new LocalSync(typeof window === 'undefined' ? undefined : fixtureStorage()), [persistent])
  const ref = useRef<TakeOnMountHandle>(null)
  const [state, setState] = useState<MissionState | null>(null)
  const [mounted, setMounted] = useState(true)
  const [error, setError] = useState('')
  const [drillStatus, setDrillStatus] = useState('')
  const [saving, setSaving] = useState(false)
  const [mountKey, setMountKey] = useState(0)
  const ready = useCallback((next: MissionState) => { setState(next); setError('') }, [])
  const receive = useCallback(() => { const next = ref.current?.currentState(); if (next) setState(next) }, [])
  const cargo = Object.entries(state?.rover.cargo ?? {}).flatMap(([resource, amount]) => {
    const mineral = mineralFromSolarResource(resource)
    return mineral && amount ? [`${mineral} ${amount}`] : []
  })
  const edits = Object.keys(state?.edits ?? {}).length
  const pause = async () => {
    if (saving) return
    setSaving(true)
    try {
      const saved = await ref.current?.saveNow()
      if (!saved) throw new Error('Field not ready')
      setState(saved)
      if (persistent) onPause?.()
      else setMounted(false)
    } catch { setError('Could not save the field. Try again before leaving.') }
    finally { setSaving(false) }
  }
  const returnWithCargo = async () => {
    if (saving || !onComplete) return
    setSaving(true)
    try {
      const saved = await ref.current?.saveNow()
      if (!saved) throw new Error('Field not ready')
      const minerals: Record<string, number> = {}
      for (const [resource, amount] of Object.entries(saved.rover.cargo)) {
        const mineral = mineralFromSolarResource(resource)
        if (mineral && typeof amount === 'number' && amount > 0) minerals[mineral] = (minerals[mineral] ?? 0) + amount
      }
      onComplete(minerals)
    } catch { setError('Could not save the field. Try again before leaving.') }
    finally { setSaving(false) }
  }
  return <div className={styles.screen} data-testid="solar-mining-preview">
    {mounted && <TakeOnMount key={mountKey} ref={ref} adapter={adapter} missionId={solarFieldId(target.id, zone)} bodyId={takeonBodyForTarget(target)}
      target={target} zone={zone} rover={rover} startView="iso" requireSolarTerrain allowSolarFieldCreation solarMining
      onReady={ready} onEvent={event => {
        if (event.type === 'mined') {
          receive()
          const mineral = event.payload.resource && mineralFromSolarResource(event.payload.resource)
          setDrillStatus(mineral ? `Collected ${event.payload.amount} ${mineral}.` : 'Ground drilled. Keep exploring for ore.')
        }
      }} onError={err => setError(err.message)} className={styles.field} />}
    <div className={styles.top}><strong>{target.name} · {zone} field</strong><span>{cargo.length ? cargo.join(' · ') : 'Hold empty'} · {edits} terrain edits</span></div>
    {error && <p className={styles.error} role="alert">{error}</p>}
    {persistent && error && <SolarFieldConflictRecovery site={solarFieldId(target.id, zone)}
      onBeforeResolve={async () => { await ref.current?.stopSaving(); setMounted(false) }}
      onResolved={() => { setError(''); setState(null); setMountKey(key => key + 1); setMounted(true) }} />}
    <div className={styles.controls}>
      {mounted ? <>
        <div className={styles.dpad} aria-label="Move rover">
          <button type="button" aria-label="Move up" onClick={() => ref.current?.move(3)}>↑</button>
          <button type="button" aria-label="Move left" onClick={() => ref.current?.move(2)}>←</button>
          <button type="button" aria-label="Move right" onClick={() => ref.current?.move(0)}>→</button>
          <button type="button" aria-label="Move down" onClick={() => ref.current?.move(1)}>↓</button>
        </div>
        <button type="button" disabled={!state} onClick={() => {
          if (!ref.current?.mine()) setDrillStatus('Cannot drill here. Move the rover and try another spot.')
        }}>DRILL</button>
        {onComplete && <button type="button" disabled={saving || !state} onClick={() => void returnWithCargo()}>RETURN TO SHIP</button>}
        <button type="button" disabled={saving || (!state && !persistent)} onClick={() => { if (!state && persistent) onPause?.(); else void pause() }}>
          {saving ? 'SAVING…' : persistent ? state ? 'SAVE & RETURN TO BASE' : 'RETURN TO BASE' : 'SAVE & LEAVE'}
        </button>
      </> : <button type="button" onClick={() => { setState(null); setMounted(true) }}>RETURN TO FIELD</button>}
    </div>
    {drillStatus && <p className={styles.status} role="status">{drillStatus}</p>}
    <p className={styles.hint}>{persistent ? 'Preview: field changes are saved, but transferring cargo and completing this mission are not available yet.' : onComplete ? 'Playtest: drive, drill, then return to your ship. Progress and rewards are isolated from your account.' : 'Drive with the arrows or tap the terrain. Drill the neighbouring ground to reveal ore.'}</p>
  </div>
}
