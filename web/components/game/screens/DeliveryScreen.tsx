'use client'

import SceneFrame from '@/components/layout/frame/SceneFrame'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useHelp } from '@/components/ui/useHelp'
import { defaultSpec, type ResourceKey } from '@takeon/engine'
import type { MineralMeta, Mission, Target } from '@/lib/data'
import { deliveryUnloadProgress } from '@/lib/systems/DeliverySystem'
import { LANDNAM_TO_TAKEON_MINERAL } from '@/lib/takeon/minerals'
import { formatCurrency, formatCountdown } from '@/lib/format'
import { SceneActions, SceneCard, SceneGhost, SceneMeter, SceneMeterHead, SceneNote, ScenePill, ScenePrimary, SceneRow, SceneRows, SceneTop, SceneVignette } from '@/components/game/hud/SceneChrome'
import TakeOnMount, { type TakeOnMountHandle } from '@/components/takeon/TakeOnMount'
import { takeonBodyForTarget } from '@/lib/takeon/bodies'
import { captureGameEvent } from '@/lib/posthog'
import styles from './DeliveryScreen.module.css'

interface DeliveryScreenProps {
  target: Target
  mission: Mission
  cargo: Record<string, number>
  minerals: Record<string, MineralMeta>
  startedAt?: number
  onBack: () => void
  onComplete: () => void
  clientName?: string
  /** Render an interactive Takeon dropoff scene instead of the animated
   * timer — used for the M3 tutorial delivery leg only. */
  useTakeonDropoff?: boolean
  rocketImageSrc?: string
}

export default function DeliveryScreen({
  target,
  mission,
  cargo,
  minerals,
  startedAt,
  onBack,
  onComplete,
  clientName,
  useTakeonDropoff,
  rocketImageSrc,
}: DeliveryScreenProps) {
  const help = useHelp('delivery')
  const [now, setNow] = useState(0)
  const completedRef = useRef(false)
  const progress = deliveryUnloadProgress(startedAt, now)
  const progressPct = Math.round(progress * 100)
  const remainingMs = Math.max(0, 8000 - Math.max(0, now - (startedAt ?? now)))
  // SSL-482: show only the minerals the contract ordered; leftover mining
  // cargo is not part of this delivery.
  const orderedMinerals = mission.requires?.minerals ? Object.keys(mission.requires.minerals) : []
  const cargoEntries = Object.entries(cargo).filter(
    ([id, amount]) => amount > 0 && (orderedMinerals.length === 0 || orderedMinerals.includes(id)),
  )
  const cargoUnits = cargoEntries.reduce((total, [, amount]) => total + amount, 0)
  const transportFee = mission.payout.francs - Math.round(mission.payout.francs * 0.5)
  const ownDelivery = mission.customPlan?.work === 'deliver'

  useEffect(() => {
    setNow(Date.now())
  }, [])

  const rover = useMemo(() => defaultSpec(), [])
  const takeonRef = useRef<TakeOnMountHandle>(null)
  const [takeonReady, setTakeonReady] = useState(!useTakeonDropoff)
  const takeonStarted = useRef(false)
  const [takeonError, setTakeonError] = useState(false)
  const [takeonAttempt, setTakeonAttempt] = useState(0)
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
  const [roverReturned, setRoverReturned] = useState(false)

  // Stable identity is load-bearing, not just perf: TakeOnMount's mount
  // effect depends on `onReady`, and this fires that exact callback. An
  // inline arrow here would get a fresh identity every render, so calling
  // it (setTakeonReady) would itself re-trigger the effect it lives in —
  // tearing down and remounting the whole Takeon scene in a tight loop.
  const handleTakeonReady = useCallback(() => { takeonStarted.current = true; setTakeonError(false); setTakeonReady(true) }, [])
  const handleTakeonError = useCallback(() => { if (!takeonStarted.current) setTakeonError(true) }, [])

  const handleDump = useCallback(() => {
    if (!takeonReady) return
    const moved = takeonRef.current?.deposit() ?? 0
    // eslint-disable-next-line no-console
    console.log('[DeliveryScreen] DUMP CARGO clicked, units moved:', moved)
    if (moved > 0) {
      captureGameEvent('delivery_cargo_dumped', { units_moved: moved })
      setDumpError(null)
      setDumped(true)
    } else {
      captureGameEvent('delivery_cargo_dump_failed', { cargo_units: cargoUnits })
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
    if (!useTakeonDropoff || !roverReturned || completedRef.current) return
    completedRef.current = true
    const id = window.setTimeout(onComplete, 350)
    return () => window.clearTimeout(id)
  }, [useTakeonDropoff, roverReturned, onComplete])

  useEffect(() => {
    if (useTakeonDropoff || progress < 1 || completedRef.current) return
    completedRef.current = true
    const id = window.setTimeout(onComplete, 350)
    return () => window.clearTimeout(id)
  }, [useTakeonDropoff, progress, onComplete])

  const manifest = (
    <SceneRows testId="delivery-cargo-hold">
      {cargoEntries.map(([id, amount]) => {
        const mineral = minerals[id]
        return <SceneRow key={id} swatch={mineral?.color ?? '#7a879a'} label={mineral?.name ?? id} value={`${amount} U`} />
      })}
    </SceneRows>
  )
  const fee = (
    <div data-testid="delivery-service-fee">
      <SceneRow label="TRANSPORT SERVICE FEE" sub="Settles at Earth debrief" value={formatCurrency(transportFee)} />
    </div>
  )

  if (useTakeonDropoff) {
    return (
      <div className={`game-screen ln-scene-delivery ${styles.screen}`} data-testid="delivery-screen">
      <SceneFrame
        surface="takeon"
        header={<SceneTop onBack={onBack}>
          <ScenePill>Cargo transfer</ScenePill>
          <ScenePill align="end" tone="white"><i style={{ fontStyle: 'normal', color: '#9fd6e4' }}>SITE</i> {target.name}</ScenePill>
          <span style={{ display: 'inline-flex' }}>{help.button}</span>
        </SceneTop>}
        status={<SceneCard label="Cargo unload status">
          <div className={styles.cardHead}>
            {rocketImageSrc && <img className={styles.landedShip} src={rocketImageSrc} alt="" />}
            <SceneMeterHead kicker={roverReturned ? 'ROVER REDOCKED' : dumped ? 'MINERALS UNLOADED' : 'DRIVE TO THE BUILDING SITE'} value={roverReturned ? 'LAUNCH READY' : dumped ? 'UNLOADED' : 'MANUAL'} />
          </div>
          {manifest}
          {!ownDelivery && fee}
          {dumpError && <SceneNote>{dumpError}</SceneNote>}
          {takeonError && <SceneNote>The surface could not be opened. Your cargo remains on the mission; retry or pause at the hub.</SceneNote>}
          {dumped && !roverReturned && <SceneNote>Cargo unloaded. Return the empty rover to the ship before launch.</SceneNote>}
          {roverReturned && <SceneNote>Rover secured. The ship is ready to launch for Earth.</SceneNote>}
        </SceneCard>}
        actions={<SceneActions>
          {!dumped ? (
            <ScenePrimary testId="delivery-dump-cargo" disabled={!takeonReady && !takeonError} onClick={takeonError ? () => { setTakeonError(false); setTakeonAttempt(attempt => attempt + 1) } : handleDump}>
              {takeonError ? 'Retry surface' : takeonReady ? 'Dump cargo at building site' : 'Preparing rover'}
            </ScenePrimary>
          ) : (
            <ScenePrimary testId="delivery-return-rover" disabled={roverReturned} onClick={() => setRoverReturned(true)}>
              {roverReturned ? 'Rover redocked · launch ready' : 'Return rover to ship'}
            </ScenePrimary>
          )}
          <SceneGhost onClick={onBack}>PAUSE AT HUB</SceneGhost>
        </SceneActions>}
        overlay={help.layer}
      >
        <div className={styles.stage}>
          <TakeOnMount
            key={takeonAttempt}
            ref={takeonRef}
            missionId={`tutorial-delivery-${mission.id}`}
            bodyId={takeonBodyForTarget(target)}
            target={target}
            zone={mission.targetId === target.id ? mission.customPlan?.zone : undefined}
            requireSolarTerrain={mission.targetId === target.id && mission.customPlan?.zone !== undefined}
            rover={rover}
            roverName="Mule Field Rover"
            seedCargo={seedCargo}
            seedCache
            startView="iso"
            onReady={handleTakeonReady}
            onError={handleTakeonError}
            className={styles.takeonMount}
          />
          {!dumped && <div className={`${styles.siteLock} lock-on`} data-testid="delivery-site-lock" aria-hidden="true" />}
        </div>
        <SceneVignette />

      </SceneFrame>
      </div>
    )
  }

  return (
    <div className={`game-screen ln-scene-delivery ${styles.screen}`} data-testid="delivery-screen">
      <SceneFrame
        surface="takeon"
        header={<SceneTop onBack={onBack}>
        <ScenePill>Cargo transfer</ScenePill>
        <ScenePill align="end" tone="white"><i style={{ fontStyle: 'normal', color: '#9fd6e4' }}>BERTH</i> {target.name}</ScenePill>
        <span style={{ display: 'inline-flex' }}>{help.button}</span>
      </SceneTop>}
        status={<SceneCard label="Cargo unload status">
        <SceneMeter kicker={progress >= 1 ? 'TRANSFER VERIFIED' : 'UNLOAD IN PROGRESS'} value={progress >= 1 ? 'SECURED' : formatCountdown(remainingMs)} pct={progressPct} caption="SHIP HOLD → CONTRACT DEPOT" captionValue={`${progressPct}%`} testId="delivery-progress" />
        {manifest}
        <SceneRows><SceneRow label="HOLD REMAINING" value={`${Math.max(0, Math.round(cargoUnits * (1 - progress)))} U`} /></SceneRows>
        {fee}
      </SceneCard>}
        actions={<SceneActions>
        <SceneGhost onClick={onBack}>PAUSE AT HUB</SceneGhost>
      </SceneActions>}
        overlay={help.layer}
      >
      <div className={styles.stage}>
        <TakeOnMount
          missionId={`delivery-view-${mission.id}-${target.id}`}
          bodyId={takeonBodyForTarget(target)}
          target={target}
          zone={mission.targetId === target.id ? mission.customPlan?.zone : undefined}
          startView="iso"
          readOnly
          className={styles.takeonMount}
        />
      </div>
      <SceneVignette />

      </SceneFrame>
    </div>
  )
}
