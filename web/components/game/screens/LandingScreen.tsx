'use client'

import { useEffect, useRef, useState } from 'react'
import { useHelp } from '@/components/ui/useHelp'
import type { Target } from '@/lib/data'
import {
  LANDING_ASCEND_DURATION_MS,
  LANDING_DESCEND_DURATION_MS,
  landingProgress,
} from '@/lib/systems/LandingSystem'
import type { LandingSequenceMode } from '@/lib/engine/scripts/LandingController'
import { formatCountdown } from '@/lib/format'
import TopBar from '@/components/ui/TopBar'
import { GhostBtn, PrimaryBtn } from '@/components/ui/Button'
import LandingScene from './LandingScene'
import styles from './LandingScreen.module.css'

interface LandingScreenProps {
  target: Target
  mode: LandingSequenceMode
  startedAt?: number
  onBack: () => void
  onContinue: () => void
}

const COPY: Record<LandingSequenceMode, {
  eyebrow: string
  title: string
  inProgress: string
  ready: string
  progressLabel: string
  cta: string
}> = {
  descend: {
    eyebrow: 'LANDER · DETACH SEQUENCE',
    title: 'Descent',
    inProgress: 'DESCENDING',
    ready: 'TOUCHDOWN CONFIRMED',
    progressLabel: 'ORBIT → SURFACE',
    cta: 'Begin Surface Operations',
  },
  ascend: {
    eyebrow: 'LANDER · REDOCK SEQUENCE',
    title: 'Ascent',
    inProgress: 'ASCENDING',
    ready: 'REDOCK COMPLETE',
    progressLabel: 'SURFACE → ORBIT',
    cta: 'Continue',
  },
}

export default function LandingScreen({ target, mode, startedAt, onBack, onContinue }: LandingScreenProps) {
  // A saved run can reopen this screen with no descent clock (Belt Courier
  // stalled at 0% and a frozen 00:08). That run is already due: land it.
  const help = useHelp('landing')
  const clockMissing = startedAt == null || !Number.isFinite(startedAt)
  const [now, setNow] = useState(() => Date.now())
  const durationMs = mode === 'descend' ? LANDING_DESCEND_DURATION_MS : LANDING_ASCEND_DURATION_MS
  const liveNow = now > 0 ? now : Date.now()
  const progress = clockMissing ? 1 : landingProgress(startedAt, liveNow, durationMs)
  const progressPct = Math.round(progress * 100)
  const remainingMs = clockMissing ? 0 : Math.max(0, durationMs - Math.max(0, liveNow - startedAt))
  const ready = clockMissing || progress >= 1
  const copy = COPY[mode]
  const landed = useRef(false)

  useEffect(() => {
    const tick = () => setNow(Date.now())
    tick()
    const id = window.setInterval(tick, 100)
    const onVisible = () => { if (!document.hidden) tick() }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      window.clearInterval(id)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [])

  useEffect(() => {
    if (!ready || landed.current) return
    landed.current = true
    onContinue()
  }, [ready, onContinue])

  return (
    <div className={`game-screen ln-scene-landing ${styles.screen}`} data-testid="landing-screen">
      <div className={styles.stage}>
        <LandingScene target={target} progress={progress} mode={mode} />
      </div>
      <div className={styles.vignette} aria-hidden="true" />

      <div className={styles.top}>
        <button type="button" className={styles.back} onClick={onBack}>BACK</button>
        <span className={styles.eyebrow}>{copy.eyebrow}</span>
        <span className={styles.target}><i>TARGET</i> {target.name}</span>
        <span className={styles.help}>{help.button}</span>
      </div>
      {help.layer}

      <section className={styles.hud} aria-label="Landing sequence status">
        <div className={styles.statusRow}>
          <div className={styles.kicker}>{ready ? copy.ready : copy.inProgress}</div>
          <div className={styles.timer}>{ready ? 'READY' : formatCountdown(remainingMs)}</div>
        </div>
        <div className={styles.track}><div className={styles.fill} style={{ width: `${progressPct}%` }} /></div>
        <div className={styles.progressMeta}>
          <span>{copy.progressLabel}</span>
          <strong data-testid="landing-progress">{progressPct}%</strong>
        </div>
      </section>

      <div className={styles.action}>
        <button type="button" className={styles.primary} data-testid="landing-continue" disabled={!ready} onClick={onContinue}>{copy.cta}</button>
        <button type="button" className={styles.ghost} onClick={onBack}>PAUSE AT HUB</button>
      </div>
    </div>
  )
}
