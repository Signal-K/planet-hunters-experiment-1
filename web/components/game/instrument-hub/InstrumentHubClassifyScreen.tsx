'use client'

import { buildPreviewWaveform } from '@/lib/instrument-hub-state'
import type { InstrumentSignal } from '@/lib/systems/InstrumentFeedSystem'
import styles from './InstrumentHubClassifyScreen.module.css'

interface InstrumentHubClassifyScreenProps {
  signal: InstrumentSignal | null
  gain: number
  zoom: number
  scrub: number
  armed: boolean
  loading: boolean
}

export function InstrumentHubClassifyScreen({
  signal,
  gain,
  zoom,
  scrub,
  armed,
  loading,
}: InstrumentHubClassifyScreenProps) {
  const seed = signal?.id ?? 'standby'
  const values = buildPreviewWaveform(seed, gain, zoom, scrub)
  const width = 640
  const height = 220
  const step = width / (values.length - 1)
  const path = values
    .map((value, index) => {
      const x = index * step
      const y = height - value * height * 0.72 - height * 0.12
      return `${index === 0 ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(1)}`
    })
    .join(' ')
  const cursorX = (scrub / 100) * width

  return (
    <div className={styles.screen} data-testid="instrument-hub-classify-screen">
      <div className={styles.grid} aria-hidden="true" />
      {loading && <p className={styles.status}>ACQUIRING DOWNLINK</p>}
      {!loading && !signal && (
        <p className={styles.status} data-testid="instrument-hub-empty">
          NO UNRESOLVED SIGNALS — ORBIT LINKED
        </p>
      )}
      {!loading && signal && (
        <>
          <div className={styles.meta}>
            <span className={styles.kind}>{signal.kind === 'transit' ? 'TESS CADENCE' : 'NEOCP TRACK'}</span>
            <strong className={styles.title}>{signal.title}</strong>
            <span className={styles.subtitle}>{signal.subtitle}</span>
          </div>
          <svg className={styles.waveform} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" aria-hidden="true">
            <path className={styles.baseline} d={`M0 ${height * 0.78} H${width}`} />
            <path className={styles.trace} d={path} style={{ strokeWidth: 2 + zoom * 1.4 }} />
            <path className={styles.cursor} d={`M${cursorX.toFixed(1)} 24 V${height - 24}`} />
          </svg>
          <div className={styles.readout}>
            <span>GAIN {gain.toFixed(0)}</span>
            <span>ZOOM {zoom.toFixed(2)}×</span>
            <span className={armed ? styles.armed : styles.standby}>{armed ? 'ARMED' : 'STANDBY'}</span>
          </div>
        </>
      )}
    </div>
  )
}
