'use client'

import { useEffect, useRef, useState } from 'react'
import type { MineralMeta, Mission, Target } from '@/lib/data'
import { deliveryUnloadProgress } from '@/lib/systems/DeliverySystem'
import { formatCurrency, formatCountdown } from '@/lib/format'
import TopBar from '@/components/ui/TopBar'
import { GhostBtn } from '@/components/ui/Button'
import DeliveryCanvas from './DeliveryCanvas'
import styles from './DeliveryScreen.module.css'

interface DeliveryScreenProps {
  target: Target
  mission: Mission
  cargo: Record<string, number>
  minerals: Record<string, MineralMeta>
  startedAt?: number
  onBack: () => void
  onComplete: () => void
}

export default function DeliveryScreen({
  target,
  mission,
  cargo,
  minerals,
  startedAt,
  onBack,
  onComplete,
}: DeliveryScreenProps) {
  const [now, setNow] = useState(() => Date.now())
  const completedRef = useRef(false)
  const progress = deliveryUnloadProgress(startedAt, now)
  const progressPct = Math.round(progress * 100)
  const remainingMs = Math.max(0, 8000 - Math.max(0, now - (startedAt ?? now)))
  const cargoEntries = Object.entries(cargo).filter(([, amount]) => amount > 0)
  const cargoUnits = cargoEntries.reduce((total, [, amount]) => total + amount, 0)
  const transportFee = mission.payout.francs - Math.round(mission.payout.francs * 0.5)

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

  useEffect(() => {
    if (progress < 1 || completedRef.current) return
    completedRef.current = true
    const id = window.setTimeout(onComplete, 350)
    return () => window.clearTimeout(id)
  }, [progress, onComplete])

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
