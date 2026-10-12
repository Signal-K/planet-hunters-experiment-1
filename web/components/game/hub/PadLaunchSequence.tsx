'use client'

import { useEffect } from 'react'
import { HubWorldBackground } from '@/components/game/hub/HubWorldBackground'
import { PixelStructure } from '@/components/game/hub/PixelStructure'
import styles from './BaseLayerScene.module.css'

/** The pad departure: flames, smoke, arms in, then the rocket leaves for flight. */
export function PadLaunchSequence({ onComplete }: { onComplete: () => void }) {
  useEffect(() => {
    const reduced = typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const id = window.setTimeout(onComplete, reduced ? 400 : 3400)
    return () => window.clearTimeout(id)
  }, [onComplete])

  return (
    <div className={styles.padLaunch} data-testid="pad-launch-sequence">
      <HubWorldBackground composition="earth-base-pad" />
      <div className={styles.padLaunchStack}>
        <PixelStructure kind="launchpad" level={3} phase="launch" />
      </div>
    </div>
  )
}
