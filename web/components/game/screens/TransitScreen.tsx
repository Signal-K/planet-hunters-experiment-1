'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { Target } from '@/lib/data'
import { BaseDock } from '@/components/game/hub/BaseDock'
import { HubClockWidget } from '@/components/game/hub/HubClockWidget'
import { formatCurrency } from '@/lib/format'
import { openSettings } from '@/lib/mining/openChrome'
import { transitBodyShiftPercent } from '@/lib/pixi/transitFlight'
import { FlightBody } from '@/components/game/screens/FlightBody'
import { FlightFlame } from '@/components/game/screens/FlightFlame'
import { FlightSky } from '@/components/game/screens/FlightSky'
import { KitRocket } from '@/components/game/hub/KitRocket'
import type { InstalledCustomizerPartsByKind } from '@/lib/data'
import styles from './FlightScene.module.css'
const FAKE_PROGRESS_START = 12
const FAKE_PROGRESS_DURATION_MS = 4400
const DELIVERY_FAKE_PROGRESS_DURATION_MS = 7000

interface Props {
  target: Target
  rocketImageSrc?: string
  arrivalAt?: number | null
  transitStartedAt?: number | null
  returning?: boolean
  onArrive: () => void
  onBack: () => void
  onPrev?: () => void
  onNext?: () => void
  onHub?: () => void
  onAbandon?: () => void
  isDelivery?: boolean
  francs?: number
  parts?: InstalledCustomizerPartsByKind | null
}

function CogIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06-.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
    </svg>
  )
}

function CubeIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M12 3l8 4.5v9L12 21l-8-4.5v-9L12 3z" />
      <path d="M12 12l8-4.5M12 12v9M12 12L4 7.5" />
    </svg>
  )
}

function BoostIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M13 2 4 14h7l-1 8 10-14h-7l0-6z" />
    </svg>
  )
}

export default function TransitScreen({
  target,
  arrivalAt,
  transitStartedAt,
  returning = false,
  onArrive,
  onBack,
  onPrev,
  onNext,
  onHub,
  isDelivery = false,
  francs = 0,
  parts,
}: Props) {
  const isTimed = typeof arrivalAt === 'number'
  const fakeDurationMs = isDelivery ? DELIVERY_FAKE_PROGRESS_DURATION_MS : FAKE_PROGRESS_DURATION_MS
  const [now, setNow] = useState(() => Date.now())
  const [fakeStartedAt, setFakeStartedAt] = useState(0)
  const [fakeProgress, setFakeProgress] = useState(FAKE_PROGRESS_START)
  const [boostMs, setBoostMs] = useState(0)
  const [boostExtra, setBoostExtra] = useState(0)
  const [boosting, setBoosting] = useState(false)
  const onArriveRef = useRef(onArrive)
  onArriveRef.current = onArrive

  useEffect(() => {
    const currentTime = Date.now()
    setNow(currentTime)
    setFakeStartedAt(transitStartedAt ?? currentTime)
    setBoostMs(0)
    setBoostExtra(0)
  }, [transitStartedAt])

  const arrivalHandledRef = useRef(false)
  const arriveOnce = useCallback(() => {
    if (arrivalHandledRef.current) return
    arrivalHandledRef.current = true
    onArriveRef.current()
  }, [])

  useEffect(() => {
    if (!isTimed) return
    const id = window.setInterval(() => setNow(Date.now()), 200)
    const onVisible = () => { if (!document.hidden) setNow(Date.now()) }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      window.clearInterval(id)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [isTimed])

  useEffect(() => {
    if (isTimed || fakeStartedAt === 0) return
    const tick = () => {
      const elapsed = Date.now() - fakeStartedAt
      setFakeProgress(Math.min(100, FAKE_PROGRESS_START + (elapsed / fakeDurationMs) * (100 - FAKE_PROGRESS_START)))
    }
    tick()
    const id = window.setInterval(tick, 100)
    const onVisible = () => { if (!document.hidden) tick() }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      window.clearInterval(id)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [isTimed, fakeStartedAt, fakeDurationMs])

  const liveNow = (now > 0 ? now : Date.now()) + boostMs
  const stableTransitStartedAt = isTimed
    ? (transitStartedAt ?? (arrivalAt ? arrivalAt - 1 : liveNow))
    : fakeStartedAt
  const totalMs = isTimed && arrivalAt ? Math.max(1, arrivalAt - stableTransitStartedAt) : 1
  const arrived = isTimed ? liveNow >= arrivalAt! : fakeProgress + boostExtra >= 100
  const progress = isTimed
    ? (arrived ? 100 : Math.min(100, Math.max(0, Math.round(((liveNow - stableTransitStartedAt) / totalMs) * 100))))
    : Math.min(100, Math.round(fakeProgress + boostExtra))

  useEffect(() => {
    if (!arrived) return
    const timer = window.setTimeout(arriveOnce, 350)
    return () => window.clearTimeout(timer)
  }, [arrived, arriveOnce])

  const boost = () => {
    if (arrived) return
    setBoosting(true)
    window.setTimeout(() => setBoosting(false), 720)
    if (isTimed && arrivalAt) {
      setBoostMs(spent => {
        const remain = Math.max(0, arrivalAt - (Date.now() + spent))
        return spent + Math.max(2500, remain * 0.22)
      })
      return
    }
    setBoostExtra(extra => extra + 14)
  }

  const shift = `${transitBodyShiftPercent(progress)}%`

  return (
    <div className={styles.screen} data-screen="transit" data-testid="transit-screen" aria-label="Flight">
      <FlightSky />
      <div className={styles.stage}>
        <div className={styles.ship} data-boosting={boosting ? 'true' : 'false'}>
          <FlightFlame boosting={boosting} />
          <div className={styles.rocketWrap}>
            <KitRocket parts={parts} space className={styles.rocket} testId="transit-rocket" />
          </div>
        </div>
        <div className={styles.body} style={{ ['--shift' as string]: shift }}>
          <FlightBody target={target} returning={returning} />
        </div>
      </div>

      <div
        className={styles.progress}
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={progress}
        aria-label="Flight progress"
        data-testid="transit-progress"
      >
        <span style={{ width: `${progress}%` }} />
      </div>

      <div className={styles.chrome}>
        <div className={styles.top}>
          <div className={styles.cluster}>
            <button type="button" className={styles.cog} data-testid="settings-button" aria-label="Settings" onClick={openSettings}>
              <CogIcon />
            </button>
            <div className={styles.clock}><HubClockWidget /></div>
          </div>
          <div className={styles.cluster}>
            <span className="scene-chip" data-testid="flight-francs-chip">{formatCurrency(francs, { compact: true })}</span>
            <span className="scene-chip" data-testid="flight-cargo-chip" aria-label="Cargo">
              <CubeIcon />
            </span>
          </div>
        </div>
      </div>

      <div className={styles.dock}>
        <BaseDock
          variant="flight"
          buildLabel="Boost"
          buildTestId="transit-boost-btn"
          buildIcon={<BoostIcon />}
          onPrev={onPrev ?? onBack}
          onNext={onNext ?? onBack}
          onBuild={boost}
          onHub={onHub ?? onBack}
        />
      </div>
    </div>
  )
}
