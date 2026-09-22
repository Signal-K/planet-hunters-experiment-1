'use client'

import { useState } from 'react'
import TopBar from '@/components/ui/TopBar'
import { ControlRoomBackdrop } from '@/components/game/screens/ControlRoomBackdrop'
import type { TimeOfDayPhase } from '@/lib/hooks/useTimeOfDay'
import styles from './page.module.css'

const PHASES: { id: TimeOfDayPhase; label: string }[] = [
  { id: 'day', label: 'DAY' },
  { id: 'dusk', label: 'DUSK' },
  { id: 'night', label: 'NIGHT' },
]

export default function ControlRoomPreviewPage() {
  const [phase, setPhase] = useState<TimeOfDayPhase>('day')
  const [hangar, setHangar] = useState(true)

  return (
    <div className={`theme-deep ${styles.page}`} data-testid="control-room-preview">
      <ControlRoomBackdrop phase={phase} showHangar={hangar} />
      <TopBar eyebrow="PREVIEW / SSL-329" title="Downlink Desk" glass />
      <section className={styles.console} aria-label="Classify workspace preview">
        <div className={styles.notes}>
          <p className={styles.eyebrow}>Slice 1 — weigh in before tutorials</p>
          <p>
            You are inside the agency. Courtyard window (mast, hangar, dish), command-deck chrome, not analog beige knobs.
          </p>
          <div className={styles.toggles}>
            {PHASES.map(option => (
              <button
                key={option.id}
                type="button"
                className={phase === option.id ? styles.toggleOn : styles.toggle}
                onClick={() => setPhase(option.id)}
              >
                {option.label}
              </button>
            ))}
            <button
              type="button"
              className={hangar ? styles.toggleOn : styles.toggle}
              onClick={() => setHangar(value => !value)}
            >
              HANGAR {hangar ? 'ON' : 'OFF'}
            </button>
          </div>
        </div>
        <header className={styles.consoleHead}>
          <div>
            <div className={styles.eyebrow}>Classify workspace</div>
            <h2>TOI 1124.01</h2>
            <p>TESS field — dummy packet for this preview only.</p>
          </div>
          <span className={styles.ready}>01 READY</span>
        </header>
        <svg className={styles.trace} viewBox="0 0 640 120" preserveAspectRatio="none" aria-hidden="true">
          <path d="M8 60 H632" />
          <path d="M8 48 L80 46 L160 52 L240 44 L300 70 L340 88 L380 68 L460 50 L540 46 L632 50" />
        </svg>
        <div className={styles.rail}>
          <span>FILTER ALL</span>
          <span>GAIN 58</span>
          <span>ZOOM 1.00X</span>
          <span>SCRUB 42</span>
          <span>ARM OFF</span>
          <span>INSPECT</span>
        </div>
      </section>
    </div>
  )
}
