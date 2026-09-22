'use client'

import { HangarModules } from '@/components/game/hub/EarthBaseModules'
import { HubWorldBackground } from '@/components/game/hub/HubWorldBackground'
import type { TimeOfDayPhase } from '@/lib/hooks/useTimeOfDay'
import styles from './ControlRoomBackdrop.module.css'

interface ControlRoomBackdropProps {
  phase?: TimeOfDayPhase
  showHangar?: boolean
  windowLabel?: string
}

/**
 * Interior downlink desk: command-deck walls + a courtyard window.
 * The window uses the Earth Base terrain kit from a closer camera so the
 * player sees a handful of campus buildings instead of the establishing shot.
 */
export function ControlRoomBackdrop({
  phase = 'day',
  showHangar = true,
  windowLabel = 'COURTYARD / EARTH BASE',
}: ControlRoomBackdropProps) {
  return (
    <div className={styles.room} data-testid="control-room-backdrop" aria-hidden="true">
      <div className={styles.ceiling} />
      <div className={styles.bezel}>
        <div className={styles.window}>
          <HubWorldBackground phase={phase} composition="earth-base-courtyard" />
          {showHangar && <div className={styles.hangar}><HangarModules /></div>}
          <div className={styles.windowLabel}>{windowLabel}</div>
        </div>
      </div>
      <div className={styles.sill} />
      <div className={styles.deck} />
    </div>
  )
}
