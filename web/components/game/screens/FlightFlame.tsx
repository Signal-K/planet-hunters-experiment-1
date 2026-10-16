'use client'

import { useEffect, useState } from 'react'
import styles from './FlightScene.module.css'

const FRAMES = [0, 1, 2] as const

/** Native exhaust frames. Boosting only speeds the cycle. */
export function FlightFlame({ boosting }: { boosting: boolean }) {
  const [frame, setFrame] = useState(0)
  useEffect(() => {
    const id = window.setInterval(() => {
      setFrame(current => (current + 1) % FRAMES.length)
    }, boosting ? 70 : 140)
    return () => window.clearInterval(id)
  }, [boosting])

  return (
    <img
      src={`/game/assets/base/kit/flame-${FRAMES[frame]}.png`}
      alt=""
      draggable={false}
      className={styles.flame}
      aria-hidden="true"
    />
  )
}
