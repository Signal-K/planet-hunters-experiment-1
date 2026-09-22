'use client'

import { useEffect, useMemo, useState, type ReactNode } from 'react'
import type { InstrumentSignal } from '@/lib/systems/InstrumentFeedSystem'
import styles from './DownlinkControlDesk.module.css'

interface DownlinkControlDeskProps {
  signals: InstrumentSignal[]
  loading?: boolean
  onInspect?: (signal: InstrumentSignal) => void
  previewControls?: ReactNode
}

function sourceLabel(kind: InstrumentSignal['kind']): string {
  return kind === 'transit' ? 'TRANSIT TELESCOPE' : 'DEEP SPACE TELESCOPE'
}

export function DownlinkControlDesk({ signals, loading = false, onInspect, previewControls }: DownlinkControlDeskProps) {
  const [selected, setSelected] = useState(0)
  const [gain, setGain] = useState(58)
  const [zoom, setZoom] = useState(100)
  const [scrub, setScrub] = useState(42)
  const [armed, setArmed] = useState(false)

  useEffect(() => {
    if (selected >= signals.length) setSelected(0)
  }, [selected, signals.length])

  const signal = signals[selected]
  const trace = useMemo(() => {
    const depth = signal?.kind === 'deep-space' ? 18 : 34
    const center = 264 + ((scrub - 42) * 2.2)
    return `M8 70 C52 58 82 60 120 68 S190 82 232 66 C246 60 ${center - 28} ${70 + depth} ${center} ${70 + depth} C${center + 26} ${70 + depth} ${center + 34} 62 ${center + 66} 66 S390 82 442 65 S520 58 632 68`
  }, [scrub, signal?.kind])

  return (
    <section className={styles.desk} aria-label="Classify workspace" data-testid="downlink-control-desk">
      <div className={styles.upperDeck}>
        <aside className={styles.packetRack}>
          <div className={styles.rackHead}>
            <span>DOWNLINK QUEUE</span>
            <strong>{signals.length.toString().padStart(2, '0')}</strong>
          </div>
          <div className={styles.packetList}>
            {loading && <p className={styles.standby}>ACQUIRING PACKETS</p>}
            {!loading && signals.length === 0 && <p className={styles.standby}>LINKED / NO UNRESOLVED DATA</p>}
            {signals.map((item, index) => (
              <button
                key={`${item.kind}:${item.id}`}
                type="button"
                className={index === selected ? styles.packetActive : styles.packet}
                onClick={() => setSelected(index)}
              >
                <span>{(index + 1).toString().padStart(2, '0')}</span>
                <strong>{item.title}</strong>
              </button>
            ))}
          </div>
          {previewControls}
        </aside>

        <div className={styles.scope}>
          <header className={styles.scopeHead}>
            <div>
              <span>{signal ? sourceLabel(signal.kind) : 'RECEIVER STANDBY'}</span>
              <h2>{signal?.title ?? 'NO ACTIVE PACKET'}</h2>
              <p>{signal?.subtitle ?? 'Orbit link nominal. Awaiting review data.'}</p>
            </div>
            <div className={signals.length ? styles.ready : styles.linked}>
              <i /> {signals.length ? 'REVIEW READY' : 'LINKED'}
            </div>
          </header>
          <div className={styles.scopeScreen}>
            <svg viewBox="0 0 640 142" preserveAspectRatio="none" aria-label="Signal light curve">
              <path className={styles.axis} d="M8 70 H632 M8 35 H632 M8 105 H632" />
              <path className={styles.traceGhost} d="M8 76 C90 52 152 90 220 70 S354 54 424 76 S548 56 632 72" />
              <path className={styles.trace} d={trace} style={{ strokeWidth: Math.max(2, gain / 18) }} />
              <path className={styles.cursor} d={`M${scrub * 6.2 + 10} 16 V126`} />
            </svg>
            <div className={styles.scopeReadout}>GAIN {gain} / ZOOM {(zoom / 100).toFixed(2)}X / SCRUB {scrub}</div>
          </div>
        </div>
      </div>

      <div className={styles.controlRail}>
        <label><span>GAIN</span><input aria-label="Gain" type="range" min="20" max="90" value={gain} onChange={event => setGain(Number(event.target.value))} /><b>{gain}</b></label>
        <label><span>ZOOM</span><input aria-label="Zoom" type="range" min="80" max="160" value={zoom} onChange={event => setZoom(Number(event.target.value))} /><b>{(zoom / 100).toFixed(2)}X</b></label>
        <label><span>SCRUB</span><input aria-label="Scrub" type="range" min="4" max="96" value={scrub} onChange={event => setScrub(Number(event.target.value))} /><b>{scrub}</b></label>
        <button type="button" className={armed ? styles.armed : styles.arm} onClick={() => setArmed(value => !value)}><span>ARM</span><b>{armed ? 'ON' : 'OFF'}</b></button>
        <button type="button" className={styles.inspect} data-testid="instrument-signal-inspect" disabled={!signal} onClick={() => signal && onInspect?.(signal)}><span>INSPECT</span><b>{signal ? 'OPEN' : 'STANDBY'}</b></button>
      </div>
    </section>
  )
}
