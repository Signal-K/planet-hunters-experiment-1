'use client'

import { useMemo, type ReactNode } from 'react'
import styles from './SkyMapBase.module.css'

export { styles as skyMapStyles }

/** A fixed star field (seeded, so it never jumps between renders). */
function starField(count: number) {
  let seed = 7
  const next = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647 }
  return Array.from({ length: count }, () => ({
    x: next() * 100,
    y: next() * 100,
    size: 1 + Math.round(next() * 2),
    delay: next() * 4,
    speed: 2 + next() * 3,
    warm: next() > 0.8,
  }))
}

interface Props {
  /** Swing the sky by this much, in percent of the frame (SSL-826). */
  pan?: { x: number; y: number }
  /** The fixed star field and Milky Way. Off where the view draws its own moving sky (the pointing chart). */
  stars?: boolean
  /** The faint scope grid. Off where the view draws a real field grid. */
  grid?: boolean
  /** Corner brackets. */
  corners?: boolean
  testId?: string
  className?: string
  children?: ReactNode
}

/**
 * SSL-830: the one sky map every sky view is built on, the dark Control Station scope. The Control Station draws its
 * reticle and anomalies on it; the pointing scene draws its whole-sky chart on it.
 */
export function SkyMapBase({ pan, stars = true, grid = true, corners = false, testId, className, children }: Props) {
  const field = useMemo(() => (stars ? starField(320) : []), [stars])
  return (
    <div className={[styles.base, className].filter(Boolean).join(' ')} data-grid={grid} data-testid={testId ?? 'sky-map-base'} aria-hidden="true">
      {stars && (
        <div className={styles.pan} data-testid="control-station-pan" style={pan ? { transform: `translate(${pan.x / 1.8}%, ${pan.y / 1.8}%)` } : undefined}>
          <div className={styles.galaxy} />
          <div className={styles.stars}>
            {field.map((star, i) => (
              <i key={i} data-warm={star.warm} style={{ left: `${star.x}%`, top: `${star.y}%`, width: star.size, height: star.size, animationDelay: `${star.delay}s`, animationDuration: `${star.speed}s` }} />
            ))}
          </div>
        </div>
      )}
      {children}
      {corners && (['tl', 'tr', 'bl', 'br'] as const).map(at => <span key={at} className={styles.corner} data-at={at} />)}
    </div>
  )
}
