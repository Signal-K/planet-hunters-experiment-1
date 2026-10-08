'use client'

import Panel from '@/components/ui/Panel'
import { PrimaryBtn } from '@/components/ui/Button'
import { LASER_CAPACITOR_TIERS, laserCapacitorBonus, nextLaserCapacitorTier } from '@/lib/data/mining-upgrades'

/**
 * SSL-462: the Debrief end of the mining loop. Names the link between the haul
 * and the next build ("You brought X, enough for Y") and spends it on the Laser
 * Capacitor, which adds charges to every later run.
 */
export default function LaserCapacitorPanel({ level, haulUnits, spareUnits, onInstall }: {
  /** Installed capacitor level. */
  level: number
  /** Ore units in this run's haul. */
  haulUnits: number
  /** Ore units free to spend: the stash, less anything a client is owed. */
  spareUnits: number
  onInstall: () => void
}) {
  const next = nextLaserCapacitorTier(level)
  const installed = LASER_CAPACITOR_TIERS.find(t => t.level === level)
  const body: React.CSSProperties = { margin: 0, textAlign: 'left', fontFamily: 'var(--ln-font-body)', fontSize: 14, lineHeight: 1.5, color: 'var(--ln-text-dim)' }

  if (!next) {
    return (
      <div data-testid="laser-capacitor-panel"><Panel accent="var(--ln-ok)" surface="solid">
        <div className="ln-section-label" style={{ marginBottom: 6 }}>Next build · Laser Capacitor</div>
        <p style={body}>{installed?.name} is installed: +{laserCapacitorBonus(level)} laser charges on every run. Fully upgraded.</p>
      </Panel></div>
    )
  }

  const canAfford = spareUnits >= next.costUnits
  const bonusGain = next.bonusCharges - laserCapacitorBonus(level)
  return (
    <div data-testid="laser-capacitor-panel"><Panel accent={canAfford ? 'var(--ln-cyan)' : 'var(--ln-hairline-strong)'} surface="solid">
      <div className="ln-section-label" style={{ marginBottom: 6 }}>Next build · {next.name}</div>
      {canAfford ? (
        <p style={body} data-testid="laser-capacitor-copy">
          You brought {haulUnits} ore, enough for {next.name} ({next.costUnits} ore). It adds {bonusGain} laser charges, so your next run lasts longer and brings home more.
        </p>
      ) : (
        <p style={body} data-testid="laser-capacitor-copy">
          You brought {haulUnits} ore. {next.name} needs {next.costUnits} spare ore and you hold {spareUnits}. Keep firing after the order is filled to bring home the rest.
        </p>
      )}
      <div style={{ marginTop: 12 }}>
        <PrimaryBtn kind="cyan" full testId="install-laser-capacitor-btn" disabled={!canAfford} onClick={onInstall}>
          {canAfford ? `Install ${next.name} · ${next.costUnits} ore` : `Need ${next.costUnits - spareUnits} more ore`}
        </PrimaryBtn>
      </div>
    </Panel></div>
  )
}
