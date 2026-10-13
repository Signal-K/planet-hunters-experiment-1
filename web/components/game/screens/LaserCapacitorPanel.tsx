'use client'

import { PrimaryBtn } from '@/components/ui/Button'
import { LASER_CAPACITOR_TIERS, laserCapacitorBonus, nextLaserCapacitorTier } from '@/lib/data/mining-upgrades'
import styles from './DebriefScreen.module.css'

/**
 * SSL-462: spend hauled ore on the next Laser Capacitor. The card stays cream
 * with dark ink — one line for the part, one line for the ore.
 */
export default function LaserCapacitorPanel({ level, spareUnits, onInstall }: {
  level: number
  haulUnits: number
  spareUnits: number
  onInstall: () => void
}) {
  const next = nextLaserCapacitorTier(level)
  const installed = LASER_CAPACITOR_TIERS.find(tier => tier.level === level)

  if (!next) {
    return (
      <section className={styles.card} data-testid="laser-capacitor-panel" data-surface="cream">
        <p className={styles.kicker}>Next build</p>
        <h2 className={styles.title}>{installed?.name ?? 'Laser Capacitor'}</h2>
        <p className={styles.note}>{laserCapacitorBonus(level)} charges on every run.</p>
      </section>
    )
  }

  const canAfford = spareUnits >= next.costUnits
  return (
    <section className={styles.card} data-testid="laser-capacitor-panel" data-surface="cream">
      <p className={styles.kicker}>Next build</p>
      <h2 className={styles.title}>{next.name}</h2>
      <p className={styles.note}>{next.costUnits} ore</p>
      <div className={styles.action}>
        <PrimaryBtn kind="cyan" full testId="install-laser-capacitor-btn" disabled={!canAfford} onClick={onInstall}>
          {canAfford ? `Install · ${next.costUnits} ore` : `Need ${next.costUnits - spareUnits} more ore`}
        </PrimaryBtn>
      </div>
    </section>
  )
}
