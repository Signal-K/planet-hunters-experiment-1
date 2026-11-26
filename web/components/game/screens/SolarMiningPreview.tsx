'use client'

import { useCallback, useMemo, useRef, useState } from 'react'
import { defaultSpec, LocalSync, type MissionState } from '@takeon/engine'
import type { Target } from '@/lib/data'
import type { MissionZone } from '@/lib/data/mission-zone'
import TakeOnMount, { type TakeOnMountHandle } from '@/components/takeon/TakeOnMount'
import { takeonBodyForTarget } from '@/lib/takeon/bodies'
import { mineralFromSolarResource } from '@/lib/takeon/solarMining'
import { solarFieldId } from '@/lib/takeon/SolarFieldSync'
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
export default function SolarMiningPreview({ target, zone }: { target: Target; zone: MissionZone }) {
  const rover = useMemo(() => defaultSpec(), [])
  const adapter = useMemo(() => new LocalSync(typeof window === 'undefined' ? undefined : fixtureStorage()), [])
  const ref = useRef<TakeOnMountHandle>(null)
  const [state, setState] = useState<MissionState | null>(null)
  const [mounted, setMounted] = useState(true)
  const [error, setError] = useState('')
  const ready = useCallback((next: MissionState) => { setState(next); setError('') }, [])
  const receive = useCallback(() => { const next = ref.current?.currentState(); if (next) setState(next) }, [])
  const cargo = Object.entries(state?.rover.cargo ?? {}).flatMap(([resource, amount]) => {
    const mineral = mineralFromSolarResource(resource)
    return mineral && amount ? [`${mineral} ${amount}`] : []
  })
  const edits = Object.keys(state?.edits ?? {}).length
  const pause = async () => {
    try {
      const saved = await ref.current?.saveNow()
      if (!saved) throw new Error('Field not ready')
      setState(saved)
      setMounted(false)
    } catch { setError('Could not save the field. Try again before leaving.') }
  }
  return <div className={styles.screen} data-testid="solar-mining-preview">
    {mounted && <TakeOnMount ref={ref} adapter={adapter} missionId={solarFieldId(target.id, zone)} bodyId={takeonBodyForTarget(target)}
      target={target} zone={zone} rover={rover} startView="iso" requireSolarTerrain allowSolarFieldCreation solarMining
      onReady={ready} onEvent={event => { if (event.type === 'mined') receive() }} onError={err => setError(err.message)} className={styles.field} />}
    <div className={styles.top}><strong>{target.name} · {zone} field</strong><span>{cargo.length ? cargo.join(' · ') : 'Hold empty'} · {edits} terrain edits</span></div>
    {error && <p className={styles.error} role="alert">{error}</p>}
    <div className={styles.controls}>
      {mounted ? <>
        <div className={styles.dpad} aria-label="Move rover">
          <button type="button" aria-label="Move up" onClick={() => ref.current?.move(3)}>↑</button>
          <button type="button" aria-label="Move left" onClick={() => ref.current?.move(2)}>←</button>
          <button type="button" aria-label="Move right" onClick={() => ref.current?.move(0)}>→</button>
          <button type="button" aria-label="Move down" onClick={() => ref.current?.move(1)}>↓</button>
        </div>
        <button type="button" disabled={!state} onClick={() => ref.current?.mine()}>DRILL</button>
        <button type="button" disabled={!state} onClick={() => void pause()}>SAVE &amp; LEAVE</button>
      </> : <button type="button" onClick={() => { setState(null); setMounted(true) }}>RETURN TO FIELD</button>}
    </div>
    <p className={styles.hint}>Drive with the arrows or tap the terrain. Drill the neighbouring ground to reveal ore.</p>
  </div>
}
