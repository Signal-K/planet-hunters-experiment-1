'use client'

import { triggerHaptic } from '@/lib/haptics'
import type { InstrumentSourceFilter } from '@/lib/instrument-hub-state'
import styles from './InstrumentHubControlsBar.module.css'

interface InstrumentHubControlsBarProps {
  sourceFilter: InstrumentSourceFilter
  gain: number
  zoom: number
  scrub: number
  armed: boolean
  canInspect: boolean
  onCycleFilter: () => void
  onGainChange: (gain: number) => void
  onZoomChange: (zoom: number) => void
  onScrubChange: (scrub: number) => void
  onToggleArm: () => void
  onSnoozePing: () => void
  onOpenInspector: () => void
}

const FILTER_LABEL: Record<InstrumentSourceFilter, string> = {
  all: 'ALL',
  transit: 'TESS',
  'deep-space': 'NEOCP',
}

export function InstrumentHubControlsBar({
  sourceFilter,
  gain,
  zoom,
  scrub,
  armed,
  canInspect,
  onCycleFilter,
  onGainChange,
  onZoomChange,
  onScrubChange,
  onToggleArm,
  onSnoozePing,
  onOpenInspector,
}: InstrumentHubControlsBarProps) {
  const press = () => triggerHaptic('press')
  const change = () => triggerHaptic('change')

  return (
    <div className={styles.bar} data-testid="instrument-hub-controls">
      <button
        type="button"
        className={styles.action}
        data-testid="instrument-control-filter"
        aria-label={`Filter source: ${FILTER_LABEL[sourceFilter]}`}
        onClick={() => {
          press()
          onCycleFilter()
        }}
      >
        <span className={styles.label}>Filter</span>
        <span className={styles.value}>{FILTER_LABEL[sourceFilter]}</span>
      </button>

      <label className={styles.sliderGroup}>
        <span className={styles.label}>Gain</span>
        <input
          type="range"
          min={0}
          max={100}
          value={gain}
          data-testid="instrument-control-gain"
          onPointerDown={() => triggerHaptic('drag')}
          onChange={event => {
            change()
            onGainChange(Number(event.target.value))
          }}
        />
        <span className={styles.value}>{gain}</span>
      </label>

      <label className={styles.sliderGroup}>
        <span className={styles.label}>Zoom</span>
        <input
          type="range"
          min={55}
          max={240}
          value={Math.round(zoom * 100)}
          data-testid="instrument-control-zoom"
          onPointerDown={() => triggerHaptic('drag')}
          onChange={event => {
            change()
            onZoomChange(Number((Number(event.target.value) / 100).toFixed(2)))
          }}
        />
        <span className={styles.value}>{zoom.toFixed(2)}×</span>
      </label>

      <label className={styles.sliderGroup}>
        <span className={styles.label}>Scrub</span>
        <input
          type="range"
          min={0}
          max={100}
          value={scrub}
          data-testid="instrument-control-scrub"
          onPointerDown={() => triggerHaptic('drag')}
          onChange={event => {
            change()
            onScrubChange(Number(event.target.value))
          }}
        />
        <span className={styles.value}>{Math.round(scrub)}</span>
      </label>

      <button
        type="button"
        className={`${styles.action}${armed ? ` ${styles.actionActive}` : ''}`}
        data-testid="instrument-control-arm"
        aria-pressed={armed}
        onClick={() => {
          press()
          onToggleArm()
        }}
      >
        <span className={styles.label}>Arm</span>
        <span className={styles.value}>{armed ? 'ON' : 'OFF'}</span>
      </button>

      <button
        type="button"
        className={styles.action}
        data-testid="instrument-control-snooze"
        onClick={() => {
          press()
          onSnoozePing()
        }}
      >
        <span className={styles.label}>Snooze</span>
        <span className={styles.value}>PING</span>
      </button>

      <button
        type="button"
        className={`${styles.action} ${styles.actionPrimary}`}
        data-testid="instrument-signal-inspect"
        disabled={!canInspect}
        onClick={() => {
          press()
          onOpenInspector()
        }}
      >
        <span className={styles.label}>Inspect</span>
        <span className={styles.value}>OPEN</span>
      </button>
    </div>
  )
}
