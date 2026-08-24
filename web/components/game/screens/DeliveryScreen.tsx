'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { defaultSpec, type ResourceKey } from '@takeon/engine'
import type { MineralMeta, Mission, Target } from '@/lib/data'
import { deliveryUnloadProgress } from '@/lib/systems/DeliverySystem'
import { LANDNAM_TO_TAKEON_MINERAL } from '@/lib/takeon/minerals'
import { formatCurrency, formatCountdown } from '@/lib/format'
import TopBar from '@/components/ui/TopBar'
import { GhostBtn, PrimaryBtn } from '@/components/ui/Button'
import DeliveryCanvas from './DeliveryCanvas'
import TakeOnMount, { type TakeOnMountHandle } from '@/components/takeon/TakeOnMount'
import styles from './DeliveryScreen.module.css'

/** Fixed flavor body for the Takeon dropoff scene — not tied to the real
 * delivery target's astronomy; Landnam still owns target/mission selection. */
const DROPOFF_BODY_ID = 'moon'

interface DeliveryScreenProps {
  target: Target
  mission: Mission
  cargo: Record<string, number>
  minerals: Record<string, MineralMeta>
  startedAt?: number
  onBack: () => void
  onComplete: () => void
  /** Render an interactive Takeon dropoff scene instead of the animated
   * timer — used for the M3 tutorial delivery leg only. */
  useTakeonDropoff?: boolean
}

export default function DeliveryScreen({
  target,
  mission,
  cargo,
  minerals,
  startedAt,
  onBack,
  onComplete,
  useTakeonDropoff,
}: DeliveryScreenProps) {
  const [now, setNow] = useState(() => Date.now())
  const completedRef = useRef(false)
  const progress = deliveryUnloadProgress(startedAt, now)
  const progressPct = Math.round(progress * 100)
  const remainingMs = Math.max(0, 8000 - Math.max(0, now - (startedAt ?? now)))
  const cargoEntries = Object.entries(cargo).filter(([, amount]) => amount > 0)
  const cargoUnits = cargoEntries.reduce((total, [, amount]) => total + amount, 0)
  const transportFee = mission.payout.francs - Math.round(mission.payout.francs * 0.5)

  const rover = useMemo(() => defaultSpec(), [])
  const takeonRef = useRef<TakeOnMountHandle>(null)
  const [takeonReady, setTakeonReady] = useState(!useTakeonDropoff)
  const [dumpError, setDumpError] = useState<string | null>(null)
  const seedCargo = useMemo(() => {
    const seeded: Partial<Record<ResourceKey, number>> = {}
    for (const [id, amount] of Object.entries(cargo)) {
      if (!amount) continue
      const resource = LANDNAM_TO_TAKEON_MINERAL[id]
      if (!resource) {
        // Silently dropping an unmapped mineral empties the rover's seeded
        // cargo instead of just under-counting it — if it's the player's
        // only cargo, DUMP CARGO can never bank anything and the mission
        // soft-locks (KES-231). Warn loudly so a future missing mapping is
        // caught in dev rather than reported as a stuck tutorial step.
        if (process.env.NODE_ENV !== 'production') {
          console.warn(`[DeliveryScreen] No Takeon resource mapping for mineral "${id}" — dropped ${amount}U from the seeded rover cargo.`)
        }
        continue
      }
      seeded[resource] = (seeded[resource] ?? 0) + amount
    }
    return seeded
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(cargo)])
  const [dumped, setDumped] = useState(false)

  const handleDump = useCallback(() => {
    if (!takeonReady) return
    const moved = takeonRef.current?.deposit() ?? 0
    // eslint-disable-next-line no-console
    console.log('[DeliveryScreen] DUMP CARGO clicked, units moved:', moved)
    if (moved > 0) {
      setDumpError(null)
      setDumped(true)
    } else {
      setDumpError(cargoUnits > 0 ? 'PARK BESIDE THE DEPOT CACHE' : 'NO CARGO IN ROVER HOLD')
    }
  }, [cargoUnits, takeonReady])

  // The interactive Takeon dropoff (useTakeonDropoff) doesn't use `now` at
  // all — `progress`/`remainingMs` are dead in that branch — but this timer
  // ran unconditionally, forcing a full DeliveryScreen re-render every
  // 100ms on top of Takeon's own independent render loop. That's pure
  // main-thread overhead layered onto an already jank-prone canvas scene
  // (KES-231: reported stutter on the M3 cargo-transfer step).
  useEffect(() => {
    if (useTakeonDropoff) return
    const tick = () => setNow(Date.now())
    const id = window.setInterval(tick, 100)
    const onVisible = () => { if (!document.hidden) tick() }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      window.clearInterval(id)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [useTakeonDropoff])

  // The interactive tutorial dropoff does not use the elapsed unload timer.
  // Keep this effect independent of `progress`: the clock refreshes every
  // 100ms, and coupling it to the completion timeout continually cancelled the
  // 350ms hand-off to Earth transit after a successful cargo dump.
  useEffect(() => {
    if (!useTakeonDropoff || !dumped || completedRef.current) return
    completedRef.current = true
    const id = window.setTimeout(onComplete, 350)
    return () => window.clearTimeout(id)
  }, [useTakeonDropoff, dumped, onComplete])

  useEffect(() => {
    if (useTakeonDropoff || progress < 1 || completedRef.current) return
    completedRef.current = true
    const id = window.setTimeout(onComplete, 350)
    return () => window.clearTimeout(id)
  }, [useTakeonDropoff, progress, onComplete])

  if (useTakeonDropoff) {
    return (
      <div className={`game-screen theme-deep ${styles.screen}`} data-testid="delivery-screen">
        <TopBar
          eyebrow={`DELIVERY TARGET · ${target.name.toUpperCase()}`}
          title="Cargo Transfer"
          onBack={onBack}
        />

        <div className={styles.stage}>
          <TakeOnMount
            ref={takeonRef}
            missionId={`tutorial-delivery-${mission.id}`}
            bodyId={DROPOFF_BODY_ID}
            rover={rover}
            roverName="Tutorial Rover"
            seedCargo={seedCargo}
            seedCache
            onReady={() => setTakeonReady(true)}
            className={styles.takeonMount}
          />
          <div className={styles.targetLabel}>
            <span>BERTH</span>
            <strong>{target.name}</strong>
          </div>
        </div>

        <section className={styles.hud} aria-label="Cargo unload status">
          <div className={styles.statusRow}>
            <div>
              <div className={styles.kicker}>{dumped ? 'TRANSFER VERIFIED' : 'DRIVE TO THE DEPOT'}</div>
              <div className={styles.contract}>{mission.title}</div>
            </div>
            <span className={styles.timer}>{dumped ? 'SECURED' : 'MANUAL'}</span>
          </div>

          <div className={styles.manifest} data-testid="delivery-cargo-hold">
            {cargoEntries.map(([id, amount]) => {
              const mineral = minerals[id]
              return (
                <div className={styles.cargoRow} key={id}>
                  <span className={styles.swatch} style={{ background: mineral?.color ?? '#7a879a' }} />
                  <span>{mineral?.name ?? id}</span>
                  <strong>{amount} U</strong>
                </div>
              )
            })}
          </div>

          <div className={styles.fee} data-testid="delivery-service-fee">
            <div>
              <span>TRANSPORT SERVICE FEE</span>
              <small>Settles at Earth debrief</small>
            </div>
            <strong>{formatCurrency(transportFee)}</strong>
          </div>

          {dumpError && <div className={styles.dumpError} role="status">{dumpError}</div>}
          <PrimaryBtn disabled={dumped || !takeonReady} testId="delivery-dump-cargo" onClick={handleDump}>
            {takeonReady ? 'Dump Cargo' : 'Preparing Rover'}
          </PrimaryBtn>
          <GhostBtn onClick={onBack}>PAUSE AT HUB</GhostBtn>
        </section>
      </div>
    )
  }

  return (
    <div className={`game-screen theme-deep ${styles.screen}`} data-testid="delivery-screen">
      <TopBar
        eyebrow={`DELIVERY TARGET · ${target.name.toUpperCase()}`}
        title="Cargo Transfer"
        onBack={onBack}
      />

      <div className={styles.stage}>
        <DeliveryCanvas progress={progress} cargoUnits={cargoUnits} />
        <div className={styles.targetLabel}>
          <span>BERTH</span>
          <strong>{target.name}</strong>
        </div>
      </div>

      <section className={styles.hud} aria-label="Cargo unload status">
        <div className={styles.statusRow}>
          <div>
            <div className={styles.kicker}>{progress >= 1 ? 'TRANSFER VERIFIED' : 'UNLOAD IN PROGRESS'}</div>
            <div className={styles.contract}>{mission.title}</div>
          </div>
          <div className={styles.timer}>{progress >= 1 ? 'SECURED' : formatCountdown(remainingMs)}</div>
        </div>

        <div className={styles.progressMeta}>
          <span>SHIP HOLD → CONTRACT DEPOT</span>
          <strong data-testid="delivery-progress">{progressPct}%</strong>
        </div>
        <div className={styles.track}>
          <div className={styles.fill} style={{ width: `${progressPct}%` }} />
        </div>

        <div className={styles.manifest} data-testid="delivery-cargo-hold">
          {cargoEntries.map(([id, amount]) => {
            const mineral = minerals[id]
            return (
              <div className={styles.cargoRow} key={id}>
                <span className={styles.swatch} style={{ background: mineral?.color ?? '#7a879a' }} />
                <span>{mineral?.name ?? id}</span>
                <strong>{amount} U</strong>
              </div>
            )
          })}
          <div className={styles.holdState}>
            <span>HOLD REMAINING</span>
            <strong>{Math.max(0, Math.round(cargoUnits * (1 - progress)))} U</strong>
          </div>
        </div>

        <div className={styles.fee} data-testid="delivery-service-fee">
          <div>
            <span>TRANSPORT SERVICE FEE</span>
            <small>Settles at Earth debrief</small>
          </div>
          <strong>{formatCurrency(transportFee)}</strong>
        </div>

        <GhostBtn onClick={onBack}>PAUSE AT HUB</GhostBtn>
      </section>
    </div>
  )
}
