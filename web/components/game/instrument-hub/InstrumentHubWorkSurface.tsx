'use client'

import type { InstrumentSignal } from '@/lib/systems/InstrumentFeedSystem'
import { InstrumentHubClassifyScreen } from './InstrumentHubClassifyScreen'
import styles from './InstrumentHubWorkSurface.module.css'

interface InstrumentHubWorkSurfaceProps {
  signals: InstrumentSignal[]
  selectedIndex: number
  selectedSignal: InstrumentSignal | null
  loading: boolean
  gain: number
  zoom: number
  scrub: number
  armed: boolean
  onSelectIndex: (index: number) => void
}

function sourceLabel(kind: InstrumentSignal['kind']): string {
  return kind === 'transit' ? 'Transit telescope' : 'Deep space telescope'
}

export function InstrumentHubWorkSurface({
  signals,
  selectedIndex,
  selectedSignal,
  loading,
  gain,
  zoom,
  scrub,
  armed,
  onSelectIndex,
}: InstrumentHubWorkSurfaceProps) {
  return (
    <section className={styles.surface} aria-label="Instrument downlink workspace">
      <header className={styles.header}>
        <span className={styles.eyebrow}>Classify workspace</span>
        <span className={styles.count}>{signals.length.toString().padStart(2, '0')} READY</span>
      </header>
      <div className={styles.preview}>
        <InstrumentHubClassifyScreen
          signal={selectedSignal}
          gain={gain}
          zoom={zoom}
          scrub={scrub}
          armed={armed}
          loading={loading}
        />
      </div>
      <div className={styles.queue} aria-label="Instrument signals">
        {loading && <p className={styles.empty}>Acquiring instrument downlink.</p>}
        {!loading && signals.length === 0 && (
          <p className={styles.empty} data-testid="instrument-hub-empty">
            No unresolved instrument data. Orbit stays linked; a ping appears on Earth Base when a new downlink arrives.
          </p>
        )}
        {signals.map((signal, index) => (
          <button
            key={`${signal.kind}:${signal.id}`}
            type="button"
            className={`${styles.signal}${index === selectedIndex ? ` ${styles.signalActive}` : ''}`}
            data-testid="instrument-signal"
            onClick={() => onSelectIndex(index)}
          >
            <span className={styles.signalKind}>{sourceLabel(signal.kind)}</span>
            <strong className={styles.signalTitle}>{signal.title}</strong>
            <span className={styles.signalMeta}>{signal.subtitle}</span>
          </button>
        ))}
      </div>
    </section>
  )
}
