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
import { SceneCard, SceneMeter, ScenePill, SceneTop, SceneVignette } from '@/components/game/hud/SceneChrome'
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
  const stage = mode === 'descend'
    ? (progress < 0.25 ? 'DETACHING' : progress < 0.55 ? 'ENTRY' : progress < 0.88 ? 'FINAL APPROACH' : 'TOUCHDOWN')
    : (progress < 0.25 ? 'LIFTOFF' : progress < 0.55 ? 'CLIMBING' : progress < 0.88 ? 'LEAVING THE SURFACE' : 'REDOCKING')
  const landed = useRef(false)
  const onContinueRef = useRef(onContinue)
  onContinueRef.current = onContinue
  const [leaving, setLeaving] = useState(false)
  const [arrived, setArrived] = useState(false)
  useEffect(() => { const id = requestAnimationFrame(() => setArrived(true)); return () => cancelAnimationFrame(id) }, [])

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
    // Dim to black first so the next scene is not a hard cut from the ground.
    setLeaving(true)
    window.setTimeout(() => onContinueRef.current(), 1500)
  }, [ready])

  return (
    <div className={`game-screen ln-scene-landing ${styles.screen}`} data-testid="landing-screen">
      <LandingScene target={target} progress={progress} mode={mode} />
      <SceneVignette />
      <div aria-hidden="true" data-testid="landing-fade" style={{ position: 'absolute', inset: 0, background: '#02040b', opacity: leaving || !arrived ? 1 : 0, transition: `opacity ${leaving ? 1400 : 700}ms ease`, pointerEvents: 'none', zIndex: 5 }} />

      <SceneTop onBack={onBack}>
        <ScenePill>{copy.eyebrow}</ScenePill>
        <ScenePill align="end" tone="white"><i style={{ fontStyle: 'normal', color: '#9fd6e4' }}>TARGET</i> {target.name}</ScenePill>
        <span style={{ display: 'inline-flex' }}>{help.button}</span>
      </SceneTop>
      {help.layer}

      <SceneCard solo label="Landing sequence status">
        <SceneMeter kicker={ready ? copy.ready : stage} value={ready ? 'READY' : formatCountdown(remainingMs)} pct={progressPct} caption={copy.progressLabel} captionValue={`${progressPct}%`} testId="landing-progress" />
      </SceneCard>
    </div>
  )
}
