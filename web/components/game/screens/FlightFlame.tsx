'use client'

import { useEffect, useState } from 'react'
import styles from './FlightScene.module.css'
import { useSpriteFailure } from '@/components/game/hub/useSpriteFailure'

const FRAMES = [0, 1, 2] as const

/** Native exhaust frames. Boosting only speeds the cycle. */
export function FlightFlame({ boosting }: { boosting: boolean }) {
  const [frame, setFrame] = useState(0)
  const sprite = useSpriteFailure('/game/assets/base/kit/flame-0.png')
  useEffect(() => {
    const id = window.setInterval(() => {
      setFrame(current => (current + 1) % FRAMES.length)
    }, boosting ? 70 : 140)
    return () => window.clearInterval(id)
  }, [boosting])

  if (sprite.failed) return <svg className={styles.flame} viewBox="0 0 48 16" aria-hidden="true" data-art-fallback="exhaust">
    <path d="M48 2 0 8l48 6Z" fill="var(--ln-cyan)" /><path d="M48 5 18 8l30 3Z" fill="var(--ln-map-sun)" />
  </svg>
  return (
    <img
      ref={sprite.image}
      onError={sprite.onError}
      src={`/game/assets/base/kit/flame-${FRAMES[frame]}.png`}
      alt=""
      draggable={false}
      className={styles.flame}
      aria-hidden="true"
    />
  )
}
