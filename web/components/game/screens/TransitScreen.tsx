'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { FlightEvent, FlightSnapshot } from '@takeon/engine'
import type { Target } from '@/lib/data'
import type { InstalledCustomizerPartsByKind } from '@/lib/data'
import TakeOnFlight, { type TakeOnFlightHandle } from '@/components/takeon/TakeOnFlight'
import { MiningDPad, MiningFireButton } from '@/components/game/screens/MiningControls'
import { DEFAULT_LIVERY, flightCraftLook, flightDestinationLook, seedFromText, type RocketLivery } from '@/lib/flight/looks'
import styles from './FlightScene.module.css'

const FAKE_PROGRESS_START = 12
// An un-timed hop is still a flight the player steers: long enough to nudge, collect a ring and fire the boost.
const FAKE_PROGRESS_DURATION_MS = 18_000
const DELIVERY_FAKE_PROGRESS_DURATION_MS = 18_000
/** How long the rocket is shown settling into orbit before the trip hands over. Arrive skips it. */
const ORBIT_HOLD_MS = 2400
/** How long the flight states its goal before clearing (the mining rule: once, in the middle, then gone). */
const GOAL_MS = 5000

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
  livery?: RocketLivery
  fragmentCount?: number
}

/**
 * The physical flight between Earth and a target (not TESS transit photometry).
 *
 * SSL-848: the scene is Takeon's 3D flight view. The rocket keeps its course; the player nudges it through blue
 * rings to charge Boost and around rocks, and a Boost shortens the trip. The persisted departure and arrival times
 * still decide when the trip ends: the flight scene is told where the clock is, never the other way round.
 */
export default function TransitScreen({
  target,
  arrivalAt,
  transitStartedAt,
  returning = false,
  onArrive,
  onBack,
  isDelivery = false,
  parts,
  livery = DEFAULT_LIVERY,
}: Props) {
  const isTimed = typeof arrivalAt === 'number'
  const fakeDurationMs = isDelivery ? DELIVERY_FAKE_PROGRESS_DURATION_MS : FAKE_PROGRESS_DURATION_MS
  const [now, setNow] = useState(() => Date.now())
  const [fakeStartedAt, setFakeStartedAt] = useState(0)
  const [fakeProgress, setFakeProgress] = useState(FAKE_PROGRESS_START)
  const [boostMs, setBoostMs] = useState(0)
  const [boostExtra, setBoostExtra] = useState(0)
  const [snapshot, setSnapshot] = useState<FlightSnapshot | null>(null)
  const [goalShown, setGoalShown] = useState(true)
  const flightRef = useRef<TakeOnFlightHandle | null>(null)
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

  useEffect(() => {
    const id = window.setTimeout(() => setGoalShown(false), GOAL_MS)
    return () => window.clearTimeout(id)
  }, [])

  const liveNow = (now > 0 ? now : Date.now()) + boostMs
  const stableTransitStartedAt = isTimed
    ? (transitStartedAt ?? (arrivalAt ? arrivalAt - 1 : liveNow))
    : fakeStartedAt
  const totalMs = isTimed && arrivalAt ? Math.max(1, arrivalAt - stableTransitStartedAt) : 1
  const arrived = isTimed ? liveNow >= arrivalAt! : fakeProgress + boostExtra >= 100
  const exact = isTimed
    ? (arrived ? 100 : Math.min(100, Math.max(0, ((liveNow - stableTransitStartedAt) / totalMs) * 100)))
    : Math.min(100, fakeProgress + boostExtra)
  const progress = Math.round(exact)

  useEffect(() => {
    if (!arrived) return
    const timer = window.setTimeout(arriveOnce, ORBIT_HOLD_MS)
    return () => window.clearTimeout(timer)
  }, [arrived, arriveOnce])

  // A boost charge spent in the scene (button, Space) is worth the same trip time a Boost press always was.
  const onFlightEvent = useCallback((event: FlightEvent) => {
    if (event.kind !== 'boost') return
    if (isTimed && arrivalAt) {
      setBoostMs(spent => {
        const remain = Math.max(0, arrivalAt - (Date.now() + spent))
        return spent + Math.max(2500, remain * 0.22)
      })
      return
    }
    setBoostExtra(extra => extra + 14)
  }, [isTimed, arrivalAt])

  const config = useMemo(() => ({
    seed: seedFromText(`${target.id}:${returning ? 'home' : 'out'}:${transitStartedAt ?? 0}`),
    hostPaced: true,
    debris: 0.38,
    pickups: 0.45,
    // Two rings charge one Boost; the flight carries no samples.
    samples: 0,
    boostGain: 0.5,
    boostCharges: 1,
  }), [target.id, returning, transitStartedAt])
  const destination = useMemo(() => flightDestinationLook(target, returning), [target, returning])
  const craft = useMemo(() => flightCraftLook(parts, livery), [parts, livery])

  const steer = useRef({ x: 0, y: 0 })
  const nudge = (axis: 'x' | 'y', value: number) => {
    steer.current[axis] = value
    flightRef.current?.steer(steer.current.x, steer.current.y)
  }

  const remainingMs = isTimed && arrivalAt ? Math.max(0, arrivalAt - liveNow) : null
  const remainingLabel = remainingMs == null ? null
    : remainingMs >= 3_600_000 ? `${Math.floor(remainingMs / 3_600_000)}h ${Math.round((remainingMs % 3_600_000) / 60_000)}m left`
    : remainingMs >= 60_000 ? `${Math.floor(remainingMs / 60_000)}m ${Math.round((remainingMs % 60_000) / 1000)}s left`
    : `${Math.ceil(remainingMs / 1000)}s left`

  const boosts = snapshot?.boosts ?? 1
  const charge = Math.min(1, boosts + (snapshot?.boostCharge ?? 0))
  const inCruise = snapshot?.phase === 'cruise'

  return (
    <div className={styles.screen} data-screen="transit" data-testid="transit-screen" data-phase={snapshot?.phase ?? 'departure'} aria-label="Flight">
      <TakeOnFlight
        ref={flightRef}
        className={styles.canvas}
        testId="transit-flight"
        config={config}
        destination={destination}
        craft={craft}
        progress={exact / 100}
        onEvent={onFlightEvent}
        onSnapshot={setSnapshot}
      />

      <div className={styles.top}>
        <button type="button" className={styles.exit} onClick={onBack}>‹ Back</button>
        <div className={styles.route}>
          <span className={styles.routeName} data-testid="transit-destination">{returning ? 'Returning to Earth' : `To ${target.name}`}</span>
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
          <span className={styles.routeEta}>{arrived ? 'In orbit' : remainingLabel ?? `${progress}%`}</span>
        </div>
      </div>

      {goalShown && !arrived && (
        <p className={styles.goal} data-testid="transit-goal" role="status">Fly through the blue rings to charge Boost. Steer around rocks.</p>
      )}

      {!arrived && (
        <MiningDPad
          onAltitude={dir => nudge('y', dir === 0 ? 0 : -dir)}
          onSpeed={dir => nudge('x', dir)}
          labels={{ up: 'Nudge up', down: 'Nudge down', left: 'Nudge left', right: 'Nudge right' }}
        />
      )}

      {arrived ? (
        <button type="button" className={styles.arrive} data-testid="transit-boost-btn" data-arrived="true" onClick={arriveOnce}>Arrive</button>
      ) : (
        <MiningFireButton
          testId="transit-boost-btn"
          meter
          label="Boost"
          charges={charge}
          max={1}
          charging={boosts < 1 && inCruise}
          firing={!!snapshot?.boosting}
          ready={boosts >= 1 && !snapshot?.boosting}
          countText={boosts >= 1 ? `×${boosts}` : `${Math.round((snapshot?.boostCharge ?? 0) * 100)}%`}
          ariaLabel={boosts >= 1 ? `Boost, ${boosts} ready` : 'Boost, charging. Fly through blue rings.'}
          onPress={() => flightRef.current?.boost()}
          onRelease={() => {}}
          onKeyFire={() => flightRef.current?.boost()}
        />
      )}
    </div>
  )
}
