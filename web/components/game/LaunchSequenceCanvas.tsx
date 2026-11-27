'use client'

import { useEffect, useRef, useState } from 'react'
import styles from './LaunchSequence.module.css'

interface Props {
  rocketName: string
  targetName: string
  onComplete: () => void
}
export const LAUNCH_COMPLETE_MS = 4_600
const FADE_FROM_MS = 3_300
const FAILSAFE_MS = 18_000

export function LaunchSequenceCanvas({ rocketName, targetName, onComplete }: Props) {
  const [elapsed, setElapsed] = useState(0)
  const completeRef = useRef(onComplete)
  const firedRef = useRef(false)
  completeRef.current = onComplete

  const finish = useRef(() => {
    if (firedRef.current) return
    firedRef.current = true
    completeRef.current()
  }).current

  useEffect(() => {
    const started = performance.now()
    let frame = 0
    const tick = (now: number) => {
      const next = Math.min(LAUNCH_COMPLETE_MS, now - started)
      setElapsed(next)
      if (next >= LAUNCH_COMPLETE_MS) finish()
      else frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    const failsafe = window.setTimeout(finish, FAILSAFE_MS)
    return () => {
      cancelAnimationFrame(frame)
      window.clearTimeout(failsafe)
    }
  }, [finish])

  const fade = Math.max(0, Math.min(1, (elapsed - FADE_FROM_MS) / (LAUNCH_COMPLETE_MS - FADE_FROM_MS)))
  const phase = elapsed < LAUNCH_IGNITION_MS ? 'Countdown · guidance locked' : elapsed < 2_000 ? 'Ignition · engines nominal' : 'Lift-off · clear of the tower'

  return (
    <div className={styles.layer} data-testid="launch-sequence-stage" data-phase={elapsed < LAUNCH_IGNITION_MS ? 'countdown' : 'ascent'}>
      <div aria-hidden="true" className={styles.fade} data-testid="launch-fade" style={{ opacity: fade }} />
      <p className={styles.caption} role="status"><span>{rocketName}</span><span>{phase}</span></p>
      <p className={styles.route}>Transit → {targetName}</p>
      {process.env.NODE_ENV === 'development' && <button type="button" className={styles.skip} data-testid="launch-sequence-skip-btn" onClick={finish}>Skip ▸</button>}
    </div>
  )
}

// The launch plays on the launchpad the player is already looking at: the
// rocket they built lifts off its own mount (the host animates it from
// `data-launching`), and the sky closes into the black the flight scene opens
// on. This layer only keeps time, captions the ascent and fades. It draws no
// second pad and no second rocket (SSL-848).
const LAUNCH_IGNITION_MS = 900
