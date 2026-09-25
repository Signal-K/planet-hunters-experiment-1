'use client'

import type { MissionRunSummary } from '@/lib/mission-runs'
import styles from './Shells.module.css'

const PHASE_LABEL: Record<MissionRunSummary['phase'], string> = {
  transit: 'In flight', landing: 'Descent', mining: 'Mining', delivery: 'Delivery', debrief: 'Arrived',
}

function Chevron({ direction }: { direction: 'previous' | 'next' }) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{direction === 'previous' ? <path d="m11 6-6 6 6 6M19 6l-6 6 6 6" /> : <path d="m13 6 6 6-6 6M5 6l6 6-6 6" />}</svg>
}

/**
 * « » between missions in progress (Orbit layout). Renders nothing with a
 * single run, so the flight screen keeps its full height.
 */
export default function MissionSwitch({ runs, onSwitch }: { runs: MissionRunSummary[]; onSwitch: (run: MissionRunSummary) => void }) {
  if (runs.length < 2) return null
  const index = Math.max(0, runs.findIndex(run => run.current))
  const current = runs[index]
  const go = (offset: number) => onSwitch(runs[(index + offset + runs.length) % runs.length])
  return (
    <div className={styles.switchBar} data-testid="orbit-mission-switch">
      <button type="button" className={styles.switchButton} onClick={() => go(-1)} aria-label="Previous mission"><Chevron direction="previous" /></button>
      <div className={styles.switchLabel}>
        <span>{PHASE_LABEL[current.phase]} · {index + 1}/{runs.length}</span>
        <strong>{current.label}</strong>
      </div>
      <button type="button" className={styles.switchButton} onClick={() => go(1)} aria-label="Next mission"><Chevron direction="next" /></button>
    </div>
  )
}
