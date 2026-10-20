'use client'

import { useEffect } from 'react'
import { HubWorldBackground } from '@/components/game/hub/HubWorldBackground'
import { PixelStructure } from '@/components/game/hub/PixelStructure'
import styles from './BaseLayerScene.module.css'

/** The pad departure: flames, smoke, arms in, then the rocket leaves for flight. */
export function PadLaunchSequence({ onComplete, fragments = 0 }: { onComplete: () => void; fragments?: number }) {
  useEffect(() => {
    const reduced = typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const id = window.setTimeout(onComplete, reduced ? 400 : 3400)
    return () => window.clearTimeout(id)
  }, [onComplete])

  return (
    <div className={styles.padLaunch} data-testid="pad-launch-sequence">
      <HubWorldBackground composition="earth-base-pad" />
      {fragments > 0 && (
        <div className={styles.padFragments} data-testid="launch-fragments">
          <p className={styles.padFragmentCount}>{fragments} fragments caught</p>
          {Array.from({ length: fragments }, (_, index) => (
            <i key={index} className={styles.padFragment} style={{ left: `${18 + index * 16}%`, animationDelay: `${index * 0.35}s` }} />
          ))}
        </div>
      )}
      <div className={styles.padLaunchStack}>
        <PixelStructure kind="launchpad" level={3} phase="launch" />
      </div>
    </div>
  )
}
