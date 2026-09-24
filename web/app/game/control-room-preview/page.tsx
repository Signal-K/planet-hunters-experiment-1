'use client'

import { useState } from 'react'
import TopBar from '@/components/ui/TopBar'
import { ControlRoomBackdrop } from '@/components/game/screens/ControlRoomBackdrop'
import { DownlinkControlDesk } from '@/components/game/screens/DownlinkControlDesk'
import type { TimeOfDayPhase } from '@/lib/hooks/useTimeOfDay'
import type { InstrumentSignal } from '@/lib/systems/InstrumentFeedSystem'
import styles from './page.module.css'

const PHASES: { id: TimeOfDayPhase; label: string }[] = [
  { id: 'day', label: 'DAY' },
  { id: 'dusk', label: 'DUSK' },
  { id: 'night', label: 'NIGHT' },
]

const PREVIEW_SIGNAL: InstrumentSignal = {
  id: 'preview-toi-1124-01',
  kind: 'transit',
  instrumentId: 'transit-telescope',
  title: 'TOI 1124.01',
  subtitle: 'TOI-1124 · TESS FIELD · S/N 8.7',
  inspectorScreen: 'galaxy',
}

export default function ControlRoomPreviewPage() {
  const [phase, setPhase] = useState<TimeOfDayPhase>('day')

  return (
    <div className={`theme-deep ${styles.page}`} data-testid="control-room-preview">
      <ControlRoomBackdrop phase={phase} />
      <TopBar eyebrow="PREVIEW / SSL-329" title="Downlink Desk" glass />
      <DownlinkControlDesk
        signals={[PREVIEW_SIGNAL]}
        previewControls={
          <div className={styles.previewControls}>
            <p>COURTYARD LIGHTING</p>
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
            </div>
          </div>
        }
      />
    </div>
  )
}
