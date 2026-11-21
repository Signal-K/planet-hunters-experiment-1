'use client'

// KES-543 / SSL-870: the mining template's cut (orbit-laser) and mine (rover) beats, played in TakeOn's 3D field.
// The field is TakeOn's (`@takeon/engine/field`): real HiRISE/Kaguya terrain on Mars and the Moon, tap-to-drive rover,
// the cream-and-blue miner on a low pass. Landnam owns the HUD (flat thumb buttons, frosted gauge strip, Menu only)
// and the cargo: what the laser cuts lands in the run's hold and settles through the usual onComplete path.
import { useCallback, useEffect, useRef, useState } from 'react'
import type { MineralMeta, Mission, Target } from '@/lib/data'
import type { RoverSpec } from '@takeon/engine'
import type { FieldSceneHandle } from '@takeon/engine/field'
import type { MiningMethod } from '@/lib/mission-templates'
import { cargoFrom, fieldResources, fieldSeed, fieldStyleFor, orderLeft } from '@/lib/field/fieldMission'
import styles from './FieldMiningScreen.module.css'

const SCAN_COOLDOWN = 4

export interface FieldMiningScreenProps {
  mission: Mission
  target: Target
  method: MiningMethod
  minerals: Record<string, MineralMeta>
  /** The player's rover build, so the field rover matches the garage. */
  roverSpec?: RoverSpec
  initialCargo?: Record<string, number>
  /** Hold size in units; unset means the order size plus room for extras. */
  cargoCapacity?: number
  onPersist?: (cargo: Record<string, number>) => void
  onBack: (cargo: Record<string, number>) => void
  onComplete: (cargo: Record<string, number>) => void
  /** Shown on the finish button for two-leg runs. */
  deliveryTargetName?: string
}

export default function FieldMiningScreen({
  mission, target, method, minerals, roverSpec, initialCargo, cargoCapacity, onPersist, onBack, onComplete, deliveryTargetName,
}: FieldMiningScreenProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const overlayRef = useRef<HTMLCanvasElement>(null)
  const sceneRef = useRef<FieldSceneHandle | null>(null)
  const startCargo = useRef(initialCargo ?? {})
  const order = mission.requires.minerals
  const orderTotal = Object.values(order).reduce((a, b) => a + b, 0)
  const startTotal = Object.values(startCargo.current).reduce((a, b) => a + b, 0)
  const capacity = Math.max(1, cargoCapacity ?? orderTotal + 6)
  const [cargo, setCargo] = useState<Record<string, number>>(startCargo.current)
  const [scanReady, setScanReady] = useState(1)
  const [holding, setHolding] = useState(false)
  const [failed, setFailed] = useState<string | null>(null)
  const [credit, setCredit] = useState<string | null>(null)
  const [hint, setHint] = useState(method === 'rover' ? 'Scan, then tap glowing ore to send the rover.' : 'Scan, then slide over glowing ore and hold the laser.')
  const [menu, setMenu] = useState(false)
  const lastScan = useRef(-Infinity)
  const cargoRef = useRef(cargo)
  cargoRef.current = cargo

  useEffect(() => {
    let disposed = false
    let handle: FieldSceneHandle | null = null
    const canvas = canvasRef.current, overlay = overlayRef.current
    if (!canvas || !overlay) return
    import('@takeon/engine/field').then(field => {
      if (disposed) return
      // Landnam's mineral colours win over TakeOn's defaults, so ore reads the same as in the hold.
      for (const [id, m] of Object.entries(minerals)) if (m.color) field.ORE_COLOURS[id] = m.color
      try {
        handle = field.mountFieldScene(canvas, {
          mode: method === 'rover' ? 'surface' : 'orbit',
          style: fieldStyleFor(target),
          seed: fieldSeed(mission.id, target.id),
          size: method === 'rover' ? 128 : 256,
          depositScale: method === 'rover' ? 1 : 1.8,
          resources: fieldResources(order, target.minerals),
          rover: roverSpec ?? true,
          overlay,
          capacity: Math.max(0, capacity - startTotal),
        })
      } catch (err) {
        setFailed(err instanceof Error ? err.message : 'The field could not start on this device.')
        return
      }
      sceneRef.current = handle
      setCredit(handle.terrain.credits[0] ?? null)
      let acc = 0
      handle.onFrame = dt => {
        acc += dt
        if (acc < 0.2) return
        acc = 0
        const next = cargoFrom(startCargo.current, handle!.miner.hold)
        const prev = cargoRef.current
        if (Object.keys(next).some(k => next[k] !== prev[k])) setCargo(next)
        setScanReady(Math.min(1, (performance.now() / 1000 - lastScan.current) / SCAN_COOLDOWN))
        if (handle!.order?.mining) setHint('Cutting. The rover stops when the seam is empty or the hold is full.')
      }
      handle.onOrder = (o, why) => {
        if (o) setHint(o.kind === 'mine' ? 'Driving to the ore. The laser cuts on arrival.' : 'Driving.')
        else if (why === 'blocked') setHint('No way through. Try another spot.')
        else setHint('Tap ore or ground to give the next order.')
      }
    })
    return () => {
      disposed = true
      handle?.destroy()
      sceneRef.current = null
    }
    // The field is built once per run; cargo flows out through onFrame.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mission.id, target.id, method])

  // Write the hold while the run is open, so a reload does not drop ore.
  useEffect(() => {
    const id = window.setInterval(() => onPersist?.(cargoRef.current), 3000)
    return () => window.clearInterval(id)
  }, [onPersist])

  const scan = useCallback(() => {
    const s = sceneRef.current
    const now = performance.now() / 1000
    if (!s || now - lastScan.current < SCAN_COOLDOWN) return
    lastScan.current = now
    setScanReady(0)
    const found = s.scan()
    setHint(found.length
      ? method === 'rover' ? `${found.length} seam${found.length > 1 ? 's' : ''} found. Tap one to mine it.` : `${found.length} seam${found.length > 1 ? 's' : ''} found. Slide over and hold the laser.`
      : 'Nothing in range. Move on and scan again.')
  }, [method])

  const laser = useCallback((on: boolean) => {
    setHolding(on)
    sceneRef.current?.laser(on)
  }, [])

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.repeat) return
      if (e.key === 'x' || e.key === 'X') scan()
      if (e.key === ' ' || e.key === 'f' || e.key === 'F') { e.preventDefault(); laser(true) }
    }
    const up = (e: KeyboardEvent) => { if (e.key === ' ' || e.key === 'f' || e.key === 'F') laser(false) }
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up) }
  }, [scan, laser])

  const { left, met } = orderLeft(order, cargo)
  const held = Object.values(cargo).reduce((a, b) => a + b, 0)
  const holdFull = held >= capacity
  const finish = deliveryTargetName ? `Deliver to ${deliveryTargetName}` : method === 'rover' ? 'Lift off' : 'Head home'

  return (
    <div className={styles.root} data-scene="field-mining" data-method={method}>
      <canvas ref={canvasRef} className={styles.canvas} aria-label={`${target.name} mining field`} />
      <canvas ref={overlayRef} className={styles.overlay} aria-hidden />

      <div className={styles.topLeft}>
        <div className={styles.gauges} aria-label="Order and hold">
          {Object.entries(order).map(([id, need]) => {
            const have = Math.min(need, cargo[id] ?? 0)
            const meta = minerals[id]
            return (
              <div key={id} className={styles.gauge} style={{ '--tone': meta?.color ?? '#3fd487' } as React.CSSProperties}>
                <span className={styles.dot} aria-hidden />
                <span className={styles.gaugeLabel}>{meta?.name ?? id}</span>
                <span className={styles.bar}><span style={{ width: `${(have / Math.max(1, need)) * 100}%` }} /></span>
                <span className={styles.num}>{have}/{need}</span>
              </div>
            )
          })}
          <div className={styles.gauge} style={{ '--tone': holdFull ? '#ff4d6a' : '#e8eef6' } as React.CSSProperties}>
            <span className={styles.dot} aria-hidden />
            <span className={styles.gaugeLabel}>Hold</span>
            <span className={styles.bar}><span style={{ width: `${Math.min(1, held / capacity) * 100}%` }} /></span>
            <span className={styles.num}>{held}/{capacity}</span>
          </div>
        </div>

        <p className={styles.hint} role="status">{failed ?? (holdFull && !met ? 'The hold is full. Head home with what you have.' : hint)}</p>
      </div>

      <button type="button" className={styles.menu} onClick={() => setMenu(true)}>Menu</button>
      {credit && <p className={styles.credit}>Real terrain · {credit}</p>}

      <div className={styles.thumbs}>
        <button
          type="button"
          className={`${styles.btn} ${styles.scan}`}
          style={{ '--charge': scanReady } as React.CSSProperties}
          onClick={scan}
          disabled={scanReady < 1}
        >
          <span className={styles.face}>Scan</span>
        </button>
        {method === 'orbit-laser' && (
          <button
            type="button"
            className={`${styles.btn} ${styles.laser} ${holding ? styles.held : ''}`}
            onPointerDown={e => { e.currentTarget.setPointerCapture(e.pointerId); laser(true) }}
            onPointerUp={() => laser(false)}
            onPointerCancel={() => laser(false)}
            disabled={holdFull}
          >
            <span className={styles.face}>Laser</span>
          </button>
        )}
      </div>

      {(met || holdFull) && (
        <button type="button" className={styles.finish} onClick={() => onComplete(cargoRef.current)}>{finish}</button>
      )}

      {menu && (
        <div className={styles.sheet} role="dialog" aria-label="Mining menu">
          <p className={styles.sheetTitle}>{mission.title}</p>
          <p className={styles.sheetBody}>
            {met ? 'The order is in the hold.' : `Still owed: ${Object.entries(left).filter(([, v]) => v > 0).map(([k, v]) => `${v} ${minerals[k]?.name ?? k}`).join(', ')}.`}
          </p>
          <button type="button" className={styles.sheetBtn} onClick={() => setMenu(false)}>Keep mining</button>
          {held > 0 && <button type="button" className={styles.sheetBtn} onClick={() => onComplete(cargoRef.current)}>{finish} now</button>}
          <button type="button" className={styles.sheetBtn} onClick={() => onBack(cargoRef.current)}>Back to base</button>
        </div>
      )}
    </div>
  )
}
