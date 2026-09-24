'use client'

import type { TimeOfDayPhase } from '@/lib/hooks/useTimeOfDay'
import styles from './ControlRoomBackdrop.module.css'

interface ControlRoomBackdropProps {
  phase?: TimeOfDayPhase
  windowLabel?: string
}

const COURTYARD_PLATES: Record<TimeOfDayPhase, string> = {
  day: '/game/assets/scenes/instrument-hub/courtyard-day.webp',
  dawn: '/game/assets/scenes/instrument-hub/courtyard-dusk.webp',
  dusk: '/game/assets/scenes/instrument-hub/courtyard-dusk.webp',
  night: '/game/assets/scenes/instrument-hub/courtyard-night.webp',
}

/**
 * Interior downlink desk: command-deck walls + a courtyard window.
 * Purpose-built plates keep the camera close on the hangar, mast, and dish;
 * this is a room view, not a crop of the Earth Base establishing shot.
 */
export function ControlRoomBackdrop({
  phase = 'day',
  windowLabel = 'COURTYARD / EARTH BASE',
}: ControlRoomBackdropProps) {
  return (
    <div className={styles.room} data-testid="control-room-backdrop" aria-hidden="true">
      <div className={styles.ceiling} />
      <div className={styles.bezel}>
        <div className={styles.window}>
          <img
            className={styles.courtyardPlate}
            src={COURTYARD_PLATES[phase]}
            alt=""
            data-courtyard-plate={phase}
            draggable={false}
          />
          <div className={styles.windowLabel}>{windowLabel}</div>
          <div className={styles.glassGlint} />
        </div>
      </div>
      <div className={styles.sill} />
      <div className={styles.roomSideLeft} />
      <div className={styles.roomSideRight} />
    </div>
  )
}
