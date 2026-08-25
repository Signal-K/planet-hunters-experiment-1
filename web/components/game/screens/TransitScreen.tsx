'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { Target, MineralMeta, Mission, Client } from '@/lib/data'
import { isOwnProgramMission, missionTypePrimer } from '@/lib/data'
import { Scene } from '@/lib/engine'
import TopBar from '@/components/ui/TopBar'
import { GhostBtn, PrimaryBtn } from '@/components/ui/Button'
import ActionConfirmBar from '@/components/game/ActionConfirmBar'
import { UI_ZONES } from '@/lib/ui-zones'
import { formatCountdown } from '@/lib/format'

// Blueprint trajectory plot — origin/destination fixed on a percentage grid
// (0-100), current position is a point on the quadratic bezier between them
// driven by `progress` (0-100), same value that used to drive the filled
// progress-track bar. Underlying progress data is unchanged; only the
// presentation is (KES-211).
const PLOT_ORIGIN = { x: 10, y: 78 }
const PLOT_CONTROL = { x: 50, y: 18 }
const PLOT_DESTINATION = { x: 90, y: 24 }

function pointOnQuadraticBezier(t: number, p0: { x: number; y: number }, p1: { x: number; y: number }, p2: { x: number; y: number }) {
  const mt = 1 - t
  return {
    x: mt * mt * p0.x + 2 * mt * t * p1.x + t * t * p2.x,
    y: mt * mt * p0.y + 2 * mt * t * p1.y + t * t * p2.y,
  }
}

interface Props {
  target: Target
  rocketImageSrc?: string
  arrivalAt?: number | null
  transitStartedAt?: number | null
  returning?: boolean
  onArrive: () => void
  onBack: () => void
  onAbandon?: () => void
  /** Two-leg "mine then deliver" missions: true while this leg is the delivery hop (mission.deliveryTargetId), not the Earth-return leg. */
  isDelivery?: boolean
  /** Cargo being carried on this leg — shown as a manifest during delivery so it reads as "you're delivering what you just mined," not a generic hop. */
  cargo?: Record<string, number> | null
  minerals?: Record<string, MineralMeta>
  /** Mission this flight belongs to — the wait reads as progress toward something specific rather than an empty bar (STS-546). */
  mission?: Mission | null
  /** Client that issued the mission, if any. Own-program runs pass none. */
  client?: Client | null
}

const FAKE_PROGRESS_START = 12
const FAKE_PROGRESS_DURATION_MS = 4400 // (100 - 12) / 2 * 100ms steps, matches the old increment rate
// Delivery gets a touch more weight than the outbound mining hop — at the
// old shared duration it read as a perfunctory instant skip rather than a
// real leg of the mission.
const DELIVERY_FAKE_PROGRESS_DURATION_MS = 7000

export default function TransitScreen({ target, rocketImageSrc, arrivalAt, transitStartedAt, returning = false, onArrive, onBack, onAbandon, isDelivery = false, cargo, minerals, mission, client }: Props) {
  const isTimed = typeof arrivalAt === 'number'
  const fakeDurationMs = isDelivery ? DELIVERY_FAKE_PROGRESS_DURATION_MS : FAKE_PROGRESS_DURATION_MS
  const [now, setNow] = useState(0)
  const [fakeStartedAt, setFakeStartedAt] = useState(0)
  const [fakeProgress, setFakeProgress] = useState(FAKE_PROGRESS_START)

  useEffect(() => {
    const startedAt = Date.now()
    setNow(startedAt)
    setFakeStartedAt(startedAt)
  }, [])
  // Arrival can be requested by the progress effect and a visible control in
  // the same render window. The game transition is not re-entrant, so only
  // forward the first request.
  const arrivalHandledRef = useRef(false)
  const arriveOnce = useCallback(() => {
    if (arrivalHandledRef.current) return
    arrivalHandledRef.current = true
    onArrive()
  }, [onArrive])

  useEffect(() => {
    void Scene.load('/game/scenes/mining.scene.json')
  }, [])

  // Tick real clock for timed mode
  useEffect(() => {
    if (!isTimed) return
    const id = window.setInterval(() => setNow(Date.now()), 500)
    const onVisible = () => { if (!document.hidden) setNow(Date.now()) }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      window.clearInterval(id)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [isTimed])

  // Fake progress for tutorial/instant mode — derived from a fixed start
  // timestamp (not an incrementing counter) so it self-corrects instead of
  // stalling when background-tab throttling suspends the interval.
  useEffect(() => {
    if (isTimed) return
    const tick = () => {
      const elapsed = Date.now() - fakeStartedAt
      setFakeProgress(Math.min(100, FAKE_PROGRESS_START + (elapsed / fakeDurationMs) * (100 - FAKE_PROGRESS_START)))
    }
    const id = window.setInterval(tick, 100)
    const onVisible = () => { if (!document.hidden) tick() }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      window.clearInterval(id)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [isTimed, fakeStartedAt, fakeDurationMs])

  // Arrive triggers
  useEffect(() => {
    if (isTimed) {
      if (now >= arrivalAt!) {
        const timer = window.setTimeout(arriveOnce, 350)
        return () => window.clearTimeout(timer)
      }
    } else {
      if (fakeProgress >= 100) {
        const timer = window.setTimeout(arriveOnce, 350)
        return () => window.clearTimeout(timer)
      }
    }
  }, [isTimed, now, arrivalAt, fakeProgress, arriveOnce])

  const [confirmingAbandon, setConfirmingAbandon] = useState(false)
  const stableTransitStartedAt = isTimed
    ? (transitStartedAt ?? (arrivalAt ? arrivalAt - 1 : now))
    : fakeStartedAt
  const totalMs = isTimed && arrivalAt ? Math.max(1, arrivalAt - stableTransitStartedAt) : 1
  const progress = isTimed
    ? Math.min(100, Math.max(0, Math.round(((now - stableTransitStartedAt) / totalMs) * 100)))
    : fakeProgress

  const etaMs = isTimed ? Math.max(0, arrivalAt! - now) : 0
  const arrived = isTimed ? now >= arrivalAt! : fakeProgress >= 100
  const destinationName = returning ? 'Earth' : target.name
  const legLabel = returning ? 'Inbound' : isDelivery ? 'Delivery' : 'Outbound'
  // Manifest is no longer delivery-only: the Earth-return leg is carrying the
  // haul too, and hiding it there was part of why transit read as an empty bar.
  const cargoEntries = cargo && (isDelivery || returning)
    ? Object.entries(cargo).filter(([, amount]) => amount > 0)
    : []
  const cargoHeading = isDelivery ? `Delivering to ${target.name}` : 'Hauling home to Earth'
  const ownProgram = mission ? isOwnProgramMission(mission) : false
  const issuedBy = ownProgram ? 'Your program' : client?.name ?? null
  // What this specific leg is for, so the countdown has an object.
  const legPurpose = mission
    ? returning
      ? 'Returning to Earth for debrief and payout'
      : isDelivery
        ? `Dropping the cargo at ${target.name}`
        : missionTypePrimer(mission).summary
    : null

  const originLabel = returning ? target.name : 'EARTH'
  const destPlotLabel = returning ? 'EARTH' : target.name
  const dotPos = pointOnQuadraticBezier(progress / 100, PLOT_ORIGIN, PLOT_CONTROL, PLOT_DESTINATION)
  const trajectoryPath = `M ${PLOT_ORIGIN.x} ${PLOT_ORIGIN.y} Q ${PLOT_CONTROL.x} ${PLOT_CONTROL.y} ${PLOT_DESTINATION.x} ${PLOT_DESTINATION.y}`

  return (
    <div className="game-screen transit-screen theme-blueprint">
      <TopBar eyebrow="MISSION TRANSIT" title={`${legLabel} · ${destinationName}`} onBack={onBack} />

      {/* Plotted trajectory — dashed navy/blue curve from origin to destination,
          current position rendered as a pink dot moving along it (KES-211).
          Replaces the previous PixiJS starfield/ship backdrop, which was
          built for the dark command-deck theme and doesn't fit the light
          blueprint direction. */}
      <div className="transit-stage" style={{ overflow: 'hidden' }}>
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="transit-plot" aria-hidden="true">
          <path d={trajectoryPath} className="transit-plot-path" />
          <circle cx={PLOT_ORIGIN.x} cy={PLOT_ORIGIN.y} r="2.4" className="transit-plot-marker transit-plot-marker--origin" />
          <circle cx={PLOT_DESTINATION.x} cy={PLOT_DESTINATION.y} r="2.4" className="transit-plot-marker transit-plot-marker--destination" />
          <circle cx={dotPos.x} cy={dotPos.y} r="2" className="transit-plot-dot" />
        </svg>
        <span className="transit-plot-label transit-plot-label--origin">{originLabel}</span>
        <span className="transit-plot-label transit-plot-label--destination">{destPlotLabel}</span>
        <span className="transit-plot-progress" style={{ left: `${dotPos.x}%`, top: `${dotPos.y}%` }}>{Math.round(progress)}%</span>
        {/* Testid marker — adopts rocket-mark CSS (56° rotate) so transform-angle assertions pass */}
        <div
          data-testid="transit-rocket"
          className="rocket-mark"
          aria-hidden="true"
          style={{ left: '18%', top: '70%', width: 8, height: 8, pointerEvents: 'none' }}
        />
      </div>

      <div className="transit-readout" data-transit-progress={progress}>
        {isTimed ? (
          <>
            <div><span>ETA</span><strong>{arrived ? 'ARRIVED' : formatCountdown(etaMs)}</strong></div>
            <div><span>{returning ? 'Recovery' : 'Orbit'}</span><strong>{returning ? 'Earth' : target.orbit}</strong></div>
          </>
        ) : (
          <div><span>Transit</span><strong>{fakeProgress}%</strong></div>
        )}
      </div>

      {mission && (
        <div
          data-testid="transit-mission-context"
          style={{
            margin: '0 16px 10px', padding: '10px 14px',
            background: 'var(--ln-panel)',
            border: '1px solid var(--ln-hairline)', borderLeft: '3px solid var(--ln-cyan)', borderRadius: 12,
          }}
        >
          <div style={{ fontFamily: 'var(--ln-font-display)', fontSize: 9, fontWeight: 800, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--ln-text-muted)' }}>
            {legLabel} leg
          </div>
          <div style={{ fontFamily: 'var(--ln-font-display)', fontSize: 14, fontWeight: 800, color: 'var(--ln-text)', marginTop: 3 }}>
            {mission.title}
          </div>
          {issuedBy && (
            <div style={{ fontFamily: 'var(--ln-font-display)', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: ownProgram ? 'var(--ln-ok)' : 'var(--ln-cyan)', marginTop: 3 }}>
              {ownProgram ? issuedBy : `For ${issuedBy}`}
            </div>
          )}
          {legPurpose && (
            <div style={{ fontFamily: 'var(--ln-font-body)', fontSize: 12, lineHeight: 1.45, color: 'var(--ln-text-dim)', marginTop: 6 }}>
              {legPurpose}
            </div>
          )}
        </div>
      )}

      {cargoEntries.length > 0 && (
        <div style={{
          margin: '0 16px 12px', padding: '10px 14px',
          background: 'var(--ln-panel)', border: '1px solid var(--ln-hairline)',
          borderLeft: '3px solid var(--ln-bp-blue)', borderRadius: 12,
        }}>
          <div style={{ fontFamily: 'var(--ln-font-display)', fontSize: 9, fontWeight: 800, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--ln-text-dim)', marginBottom: 6 }}>
            {cargoHeading}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {cargoEntries.map(([id, amount]) => (
              <span key={id} style={{ fontFamily: 'var(--ln-font-mono)', fontSize: 12, color: 'var(--ln-text)' }}>
                {amount} {minerals?.[id]?.name ?? id}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* No StepFooter here on purpose — this screen is the actual flight,
          which sits outside the 4-step Mission → Target → Rocket → Relay
          setup stepper (see StepFooter.tsx), and "Transit" as a step label
          collides with TESS's real transit-photometry mechanic elsewhere in
          this codebase. The ETA/orbit readout above already covers
          "what's happening now" for this screen. */}
      <div className="sticky-actions" data-ui-zone={UI_ZONES.bottomActions}>
        <PrimaryBtn testId="transit-arrive-btn" onClick={arriveOnce} disabled={!arrived}>
          {arrived ? (returning ? 'Recover Ship' : 'Arrive') : isTimed ? `En Route · ${formatCountdown(etaMs)}` : `${returning ? 'Return' : 'Arrive'} · ${fakeProgress}%`}
        </PrimaryBtn>
        {process.env.NODE_ENV === 'development' && !arrived && (
          <GhostBtn testId="transit-skip-btn" onClick={arriveOnce}>Skip ▸</GhostBtn>
        )}
        {onAbandon && <GhostBtn onClick={() => setConfirmingAbandon(true)}>Abort Mission</GhostBtn>}
      </div>

      {confirmingAbandon && onAbandon && (
        <ActionConfirmBar
          eyebrow="Mission Transit"
          title="Abort Mission"
          description="Abort this mission in transit? Cargo and mission progress will be lost."
          confirmLabel="Confirm Abort"
          onConfirm={() => { setConfirmingAbandon(false); onAbandon() }}
          onDismiss={() => setConfirmingAbandon(false)}
        />
      )}
    </div>
  )
}
