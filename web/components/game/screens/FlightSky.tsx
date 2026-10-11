'use client'

import { useMemo } from 'react'
import styles from './FlightScene.module.css'

function mulberry32(seed: number) {
  let s = seed >>> 0
  return () => {
    s = (s + 1831565813) >>> 0
    let t = Math.imul(s ^ (s >>> 15), 1 | s)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function stars(seed: number, count: number) {
  const rand = mulberry32(seed)
  return Array.from({ length: count }, (_, i) => {
    const roll = rand()
    const size = roll > 0.92 ? '3' : roll > 0.6 ? '2' : '1'
    return {
      id: `${seed}-${i}`,
      size,
      left: `${(rand() * 100).toFixed(2)}%`,
      top: `${(rand() * 100).toFixed(2)}%`,
      opacity: 0.35 + rand() * 0.65,
    }
  })
}

function Field({ items }: { items: ReturnType<typeof stars> }) {
  return (
    <div className={styles.starField}>
      {items.map(star => (
        <i
          key={star.id}
          className={styles.star}
          data-size={star.size}
          style={{ left: star.left, top: star.top, opacity: star.opacity }}
        />
      ))}
    </div>
  )
}

/** Layered space: a wash, drifting dust, and three parallax star fields. Not a single backdrop image. */
export function FlightSky() {
  const layers = useMemo(() => ({
    far: stars(11, 72),
    mid: stars(29, 40),
    near: stars(47, 22),
  }), [])

  return (
    <div className={styles.sky} aria-hidden="true">
      <div className={styles.wash} data-layer="wash" />
      <div className={styles.dust} data-layer="dust-far" data-tone="soft" style={{ width: '52%', height: '34%', top: '4%', left: '-8%', animationDuration: '110s' }} />
      <div className={styles.dust} data-layer="dust-mid" style={{ width: '42%', height: '26%', top: '28%', left: '22%', animationDuration: '84s', animationDelay: '-30s' }} />
      <div className={styles.dust} data-layer="dust-near" data-tone="soft" style={{ width: '48%', height: '28%', top: '48%', left: '46%', animationDuration: '128s', animationDelay: '-50s' }} />
      <div className={styles.dust} data-layer="dust-low" style={{ width: '36%', height: '22%', top: '62%', left: '4%', animationDuration: '96s', animationDelay: '-12s' }} />
      {(['far', 'mid', 'near'] as const).map(speed => (
        <div key={speed} className={styles.starTrack} data-layer={`stars-${speed}`} data-speed={speed}>
          <Field items={layers[speed]} />
          <Field items={layers[speed]} />
        </div>
      ))}
    </div>
  )
}
