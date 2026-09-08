'use client'

import { HubWorldBackground } from '@/components/game/hub/HubWorldBackground'
import { HangarModules, LaunchpadModules } from '@/components/game/hub/EarthBaseModules'
import styles from './MissionSceneBackdrop.module.css'

/**
 * The mission-creation journey is one physical place: the Earth base.  Each
 * step changes the instrument in front of the player, rather than swapping to
 * another app-like background.  Keeping this as a real composed scene also
 * keeps the DOM controls honest: they sit in the world, not on a blank board.
 */
export default function MissionSceneBackdrop({
  composition = 'earth-base-wide',
}: {
  composition?: 'earth-base-wide' | 'earth-base-pad'
}) {
  return (
    <div className={styles.backdrop} data-testid="mission-setup-background">
      <div className={styles.terrain}>
        <HubWorldBackground phase="day" composition={composition} />
      </div>
      <div className={styles.launchpad} data-testid="mission-setup-launchpad-structure">
        <LaunchpadModules />
      </div>
      <div className={styles.hangar} data-testid="mission-setup-hangar-structure">
        <HangarModules />
      </div>
    </div>
  )
}
