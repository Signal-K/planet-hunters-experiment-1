'use client'

import { useEffect, useState } from 'react'
import { ROLLOUT_FRAME_MS, ROLLOUT_FRAMES, rolloutFrame } from '@/lib/rocket-rollout'
import styles from './BaseLayerScene.module.css'

/** Pixel rollout from the hangar door to the pad. The last frame matches the pad rocket. */
export function RocketRollout({ onDone }: { onDone: () => void }) {
  const [frame, setFrame] = useState(0)

  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduced) {
      setFrame(ROLLOUT_FRAMES - 1)
      const done = window.setTimeout(onDone, 40)
      return () => window.clearTimeout(done)
    }
    let current = 0
    const id = window.setInterval(() => {
      current += 1
      if (current >= ROLLOUT_FRAMES) {
        window.clearInterval(id)
        onDone()
        return
      }
      setFrame(current)
    }, ROLLOUT_FRAME_MS)
    return () => window.clearInterval(id)
  }, [onDone])

  const pose = rolloutFrame(frame)
  return (
    <div
      className={styles.rollout}
      data-testid="rocket-rollout"
      data-frame={frame}
      data-pose={pose.pose}
      style={{
        ['--t' as string]: pose.t,
        ['--lift' as string]: pose.lift,
        ['--grow' as string]: pose.grow,
        ['--fw' as string]: pose.w,
      }}
    >
      <img src={pose.src} alt="" draggable={false} />
    </div>
  )
}
