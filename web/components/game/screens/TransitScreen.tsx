'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { Target, MineralMeta, Mission, Client } from '@/lib/data'
import { isOwnProgramMission, missionTypePrimer } from '@/lib/data'
import TopBar from '@/components/ui/TopBar'
import ActionConfirmBar from '@/components/game/ActionConfirmBar'
import TransitCanvas from '@/components/game/screens/TransitCanvas'
import { UI_ZONES } from '@/lib/ui-zones'
import { formatCountdown } from '@/lib/format'

const DISTANCE_PER_ORBIT_UNIT_MM = 420
const FAKE_PROGRESS_START = 12
const FAKE_PROGRESS_DURATION_MS = 4400
const DELIVERY_FAKE_PROGRESS_DURATION_MS = 7000

// Deterministic "passing waypoint" markers along the flight progress track —
// gives Transit an active-navigation feel instead of a passive percentage
// wait. Each flips to a "passed" state once progress crosses its threshold.
const TRANSIT_WAYPOINTS = [
  { atPercent: 25, label: 'MIDCOURSE' },
  { atPercent: 50, label: 'HALFWAY' },
  { atPercent: 75, label: 'APPROACH' },
] as const

interface Props {
  target: Target
  rocketImageSrc?: string
  arrivalAt?: number | null
  transitStartedAt?: number | null
  returning?: boolean
  onArrive: () => void
  onBack: () => void
  onAbandon?: () => void
  isDelivery?: boolean
  cargo?: Record<string, number> | null
  minerals?: Record<string, MineralMeta>
  mission?: Mission | null
  client?: Client | null
}

export default function TransitScreen({ target, rocketImageSrc, arrivalAt, transitStartedAt, returning = false, onArrive, onBack, onAbandon, isDelivery = false, cargo, minerals, mission, client }: Props) {
  const isTimed = typeof arrivalAt === 'number'
  const fakeDurationMs = isDelivery ? DELIVERY_FAKE_PROGRESS_DURATION_MS : FAKE_PROGRESS_DURATION_MS
  const [now, setNow] = useState(0)
  const [fakeStartedAt, setFakeStartedAt] = useState(0)
  const [fakeProgress, setFakeProgress] = useState(FAKE_PROGRESS_START)

  // Tutorial legs are fast, but they are still real mission state. Use the
  // persisted launch timestamp when one exists so a remount does not rewind
  // the flight to its first frame.
  useEffect(() => {
    const currentTime = Date.now()
    setNow(currentTime)
    setFakeStartedAt(transitStartedAt ?? currentTime)
  }, [transitStartedAt])

  const arrivalHandledRef = useRef(false)
  const arriveOnce = useCallback(() => {
    if (arrivalHandledRef.current) return
    arrivalHandledRef.current = true
    onArrive()
  }, [onArrive])

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

  useEffect(() => {
    const arrived = isTimed ? now >= (arrivalAt ?? Number.POSITIVE_INFINITY) : fakeProgress >= 100
    if (!arrived) return
    const timer = window.setTimeout(arriveOnce, 350)
    return () => window.clearTimeout(timer)
  }, [isTimed, now, arrivalAt, fakeProgress, arriveOnce])

  const [confirmingAbandon, setConfirmingAbandon] = useState(false)
  const stableTransitStartedAt = isTimed
    ? (transitStartedAt ?? (arrivalAt ? arrivalAt - 1 : now))
    : fakeStartedAt
  const totalMs = isTimed && arrivalAt ? Math.max(1, arrivalAt - stableTransitStartedAt) : 1
  const progress = isTimed
    ? Math.min(100, Math.max(0, Math.round(((now - stableTransitStartedAt) / totalMs) * 100)))
    : Math.round(fakeProgress)
  const etaMs = isTimed ? Math.max(0, arrivalAt! - now) : 0
  const arrived = isTimed ? now >= arrivalAt! : fakeProgress >= 100
  const destinationName = returning ? 'Earth' : target.name
  const legLabel = returning ? 'Inbound' : isDelivery ? 'Delivery' : 'Outbound'
  const cargoEntries = cargo && (isDelivery || returning)
    ? Object.entries(cargo).filter(([, amount]) => amount > 0)
    : []
  const ownProgram = mission ? isOwnProgramMission(mission) : false
  const issuedBy = ownProgram ? 'Your program' : client?.name ?? null
  const legPurpose = mission
    ? returning
      ? 'Returning to Earth for debrief and payout'
      : isDelivery
        ? `Dropping cargo at ${target.name}`
        : missionTypePrimer(mission).summary
    : null

  const totalDistanceMm = target.orbit * DISTANCE_PER_ORBIT_UNIT_MM
  const remainingDistanceMm = Math.round(totalDistanceMm * (1 - progress / 100))
  const speedMmPerHour = isTimed && totalMs > 0 ? Math.round(totalDistanceMm / (totalMs / 3_600_000)) : null
  const targetKind = target.type === 'asteroid' ? 'asteroid' : 'planet'

  return (
    <div className="game-screen transit-screen">
      <TopBar eyebrow={`${legLabel} LEG · MISSION TRANSIT`} title={destinationName} onBack={onBack} glass />

      <main className="transit-flight-scene" aria-label={`Flight to ${destinationName}`}>
        <TransitCanvas
          targetName={destinationName}
          targetKind={returning ? 'earth' : targetKind}
          rocketImageSrc={rocketImageSrc}
          progress={progress}
        />

        <div className="transit-flight-vignette" aria-hidden="true" />

        <div className="transit-destination-chip">
          <span className="transit-destination-chip__status">COURSE LOCKED</span>
          <strong>{destinationName}</strong>
          <span>{returning ? 'EARTH RECOVERY VECTOR' : `${target.type.toUpperCase()} · ORBIT ${target.orbit}`}</span>
        </div>

        {mission && (
          <section className="transit-mission-card" data-testid="transit-mission-context" aria-label="Mission context">
            <div className="transit-mission-card__eyebrow">{legLabel} mission</div>
            <strong>{mission.title}</strong>
            {issuedBy && <span className={ownProgram ? 'transit-mission-card__own' : ''}>{ownProgram ? issuedBy : `Issued by ${issuedBy}`}</span>}
            {legPurpose && <p>{legPurpose}</p>}
          </section>
        )}

        <section className="transit-flight-hud transit-readout" data-transit-progress={progress} aria-label="Flight telemetry">
          <div className="transit-flight-hud__heading">
            <span>{returning ? 'EARTH RETURN' : 'DEEP-SPACE FLIGHT'}</span>
            <strong>{progress}%</strong>
          </div>
          <div className="transit-progress-wrap">
            <div className="transit-progress-track" aria-hidden="true">
              <span style={{ width: `${progress}%` }} />
            </div>
            {TRANSIT_WAYPOINTS.map(wp => {
              const passed = progress >= wp.atPercent
              return (
                <div
                  key={wp.label}
                  className={`transit-waypoint${passed ? ' transit-waypoint--passed' : ''}`}
                  style={{ left: `${wp.atPercent}%` }}
                  data-testid={`transit-waypoint-${wp.label.toLowerCase()}`}
                  data-passed={passed}
                >
                  <span className={`transit-waypoint-label${passed ? ' transit-waypoint-label--passed' : ''}`}>
                    {wp.label}
                  </span>
                </div>
              )
            })}
          </div>
          <div className="transit-telemetry">
            <div><span>ETA</span><strong>{isTimed ? (arrived ? 'ARRIVED' : formatCountdown(etaMs)) : arrived ? 'ARRIVED' : 'IN FLIGHT'}</strong></div>
            <div><span>RANGE</span><strong>{arrived ? '0 Mm' : `${remainingDistanceMm.toLocaleString()} Mm`}</strong></div>
            {speedMmPerHour !== null && <div><span>SPEED</span><strong>{arrived ? '0 Mm/h' : `${speedMmPerHour.toLocaleString()} Mm/h`}</strong></div>}
            <div><span>{returning ? 'DESTINATION' : 'ORBIT'}</span><strong>{returning ? 'EARTH' : target.orbit}</strong></div>
          </div>
          {cargoEntries.length > 0 && (
            <div className="transit-cargo-strip">
              <span>{isDelivery ? `CARGO FOR ${target.name.toUpperCase()}` : 'RETURN CARGO'}</span>
              <strong>{cargoEntries.map(([id, amount]) => `${amount} ${minerals?.[id]?.name ?? id}`).join(' · ')}</strong>
            </div>
          )}
        </section>
      </main>

      <div className="transit-command-dock" data-ui-zone={UI_ZONES.bottomActions}>
        <div className="transit-command-dock__status">
          <span>{arrived ? 'FLIGHT COMPLETE' : 'AUTOPILOT ENGAGED'}</span>
          <strong>{arrived ? `Ready for ${returning ? 'recovery' : 'surface operations'}` : `En route to ${destinationName}`}</strong>
        </div>
        <div className="transit-command-actions">
          <button type="button" className="transit-command-btn transit-command-btn--arrive" data-testid="transit-arrive-btn" onClick={arriveOnce} disabled={!arrived}>
            {arrived ? (returning ? 'RECOVER SHIP' : 'BEGIN SURFACE OPS') : isTimed ? `ARRIVE · ${formatCountdown(etaMs)}` : `ARRIVE · ${progress}%`}
          </button>
          {process.env.NODE_ENV === 'development' && !arrived && (
            <button type="button" className="transit-command-btn" data-testid="transit-skip-btn" onClick={arriveOnce}>SKIP FLIGHT</button>
          )}
          {onAbandon && <button type="button" className="transit-command-btn transit-command-btn--danger" onClick={() => setConfirmingAbandon(true)}>ABORT MISSION</button>}
        </div>
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
