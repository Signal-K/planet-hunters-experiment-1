'use client'

import { useEffect, useState } from 'react'
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
import LandingCanvas from './LandingCanvas'
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
  const [now, setNow] = useState(() => Date.now())
  const durationMs = mode === 'descend' ? LANDING_DESCEND_DURATION_MS : LANDING_ASCEND_DURATION_MS
  const progress = landingProgress(startedAt, now, durationMs)
  const progressPct = Math.round(progress * 100)
  const remainingMs = Math.max(0, durationMs - Math.max(0, now - (startedAt ?? now)))
  const ready = progress >= 1
  const copy = COPY[mode]

  useEffect(() => {
    const tick = () => setNow(Date.now())
    const id = window.setInterval(tick, 100)
    const onVisible = () => { if (!document.hidden) tick() }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      window.clearInterval(id)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [])

  return (
    <div className={`game-screen theme-deep ${styles.screen}`} data-testid="landing-screen">
      <TopBar eyebrow={copy.eyebrow} title={copy.title} onBack={onBack} />

      <div className={styles.stage}>
        <LandingCanvas progress={progress} mode={mode} />
        <div className={styles.targetLabel}>
          <span>TARGET</span>
          <strong>{target.name}</strong>
        </div>
      </div>

      <section className={styles.hud} aria-label="Landing sequence status">
        <div className={styles.statusRow}>
          <div>
            <div className={styles.kicker}>{ready ? copy.ready : copy.inProgress}</div>
            <div className={styles.contract}>{target.name}</div>
          </div>
          <div className={styles.timer}>{ready ? 'READY' : formatCountdown(remainingMs)}</div>
        </div>

        <div className={styles.progressMeta}>
          <span>{copy.progressLabel}</span>
          <strong data-testid="landing-progress">{progressPct}%</strong>
        </div>
        <div className={styles.track}>
          <div className={styles.fill} style={{ width: `${progressPct}%` }} />
        </div>

        <PrimaryBtn disabled={!ready} testId="landing-continue" onClick={onContinue}>
          {copy.cta}
        </PrimaryBtn>
        <GhostBtn onClick={onBack}>PAUSE AT HUB</GhostBtn>
      </section>
    </div>
  )
}
