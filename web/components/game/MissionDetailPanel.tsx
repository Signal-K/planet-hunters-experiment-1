'use client'

import React from 'react'
import type { Mission, Client, MineralMeta } from '@/lib/data'
import { isOwnProgramMission, missionDifficultyLabel, missionPayoutTier } from '@/lib/data'
import MineralChip from '@/components/game/MineralChip'
import { missionCardTags } from '@/components/game/MissionCard'
import styles from '@/components/game/screens/MissionBoard.module.css'

type CardState = 'available' | 'locked' | 'cooldown' | 'completed'

interface MissionDetailPanelProps {
  mission: Mission | null
  client?: Client | null
  mineralMeta: Record<string, MineralMeta>
  targetCount: number
  displayPayout: number
  affinityReward: number
  unlocked: boolean
  isStoryMission: boolean
  cardState: CardState
  lockedDetail?: string
  cooldownLabel?: string
  routeLabel?: string
  onPick: () => void
}

export default function MissionDetailPanel({
  mission,
  client: clientProp,
  mineralMeta,
  targetCount,
  displayPayout,
  affinityReward,
  unlocked,
  isStoryMission,
  cardState,
  lockedDetail,
  cooldownLabel,
  routeLabel,
  onPick,
}: MissionDetailPanelProps) {
  if (!mission) {
    return (
      <div className={styles.emptyState}>
        <div className={styles.emptyIcon}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
            <circle cx="12" cy="12" r="4" /><circle cx="12" cy="12" r="8" />
          </svg>
        </div>
        <div className={styles.emptyLabel}>Select a contract</div>
        <div className={styles.emptyDesc}>Pick a client contract from the board to view details, resource requirements, and payout breakdown.</div>
      </div>
    )
  }

  // Own-program runs (your telescope/satellite launches, your own
  // infrastructure, self-directed mining) never carry client chrome — no
  // client name, no pay premium, no affinity, no payout disclaimer.
  const ownOperation = isOwnProgramMission(mission)
  const client = ownOperation ? null : clientProp
  const accent = client?.color ?? '#6cd4ff'
  const cargoUnits =Object.values(mission.requires.minerals).reduce((sum, n) => sum + n, 0)
  const tags = missionCardTags({ mission, client, isStoryMission, cardState, lockedDetail, cooldownLabel, routeLabel })
  const isAvailable = cardState === 'available'
  const ctaLabel = cardState === 'cooldown' ? (cooldownLabel ? `Cooldown · ${cooldownLabel}` : 'On cooldown')
    : cardState === 'locked' ? (lockedDetail ? `Locked · ${lockedDetail}` : 'Locked')
    : cardState === 'completed' ? 'Completed today'
    : `Continue · ${targetCount} target${targetCount !== 1 ? 's' : ''}`

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 36, height: 36, borderRadius: 6, background: accent, color: '#141018', display: 'flex', alignItems: 'center', justifyContent: 'center', font: '800 11px var(--ln-font-display)', flexShrink: 0 }}>
          {client?.initial ?? 'OP'}
        </div>
        <div style={{ minWidth: 0 }}>
          <div className={styles.detailHeading}>{mission.title}</div>
          <div className={styles.detailClient}>{client?.name ?? (ownOperation ? 'Your program' : 'Free Ops')}</div>
        </div>
      </div>

      <div className={styles.detailWants}>
        {ownOperation
          ? 'Your own operation · no client, no order to fill'
          : isStoryMission
          ? 'Story mission · not a client request'
          : client
            ? <>Wants <b>{client.mineralPreferences.map(id => mineralMeta[id]?.name ?? id).join(' / ')}</b> · +{Math.round(client.payoutPremium * 100)}% pay</>
            : 'Choose target · keep the haul · market-led mining'}
      </div>

      {routeLabel && <div className={styles.cardRoute}>{routeLabel}</div>}

      <div className={styles.detailRow}>
        <span className={styles.detailChip}><b>{cargoUnits}U</b>&nbsp;Cargo</span>
        {/* Difficulty grade + qualitative payout tier (STS-543) — the two reads
            the board previously kept internal, so the progression curve was
            invisible to the player. */}
        <span className={styles.detailChip} data-testid={`mission-detail-difficulty-${mission.id}`}>
          <b>{mission.difficulty}</b>&nbsp;{missionDifficultyLabel(mission.difficulty)}
        </span>
        <span className={styles.detailChip} data-testid={`mission-detail-payout-tier-${mission.id}`}>
          {missionPayoutTier(mission)}&nbsp;payout
        </span>
        {client && <span className={`${styles.detailChip} ${styles.detailChipPay}`}><b>+{Math.round(client.payoutPremium * 100)}%</b>&nbsp;Pay bonus</span>}
        {!isStoryMission && client && <span className={`${styles.detailChip} ${styles.detailChipAff}`}><b>+{affinityReward}</b>&nbsp;Affinity</span>}
      </div>

      <div className={styles.detailRow}>
        {tags.map((t, i) => <span key={i} className={styles.tag}>{t.label}</span>)}
      </div>

      {Object.keys(mission.requires.minerals).length > 0 && (
        <div className={styles.detailRow} style={{ paddingTop: 4, borderTop: '1px solid rgba(255,255,255,.06)' }}>
          {Object.entries(mission.requires.minerals).map(([id, qty]) => (
            <MineralChip key={id} meta={mineralMeta[id]} mineral={id} count={qty} />
          ))}
        </div>
      )}

      {mission.brief && <div style={{ font: '400 12.5px/1.55 var(--ln-font-body)', color: 'var(--ln-text-dim)' }}>{mission.brief}</div>}

      {client && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, paddingTop: 8, borderTop: '1px solid rgba(255,255,255,.06)' }}>
          <div style={{ font: '500 11px/1.4 var(--ln-font-display)', color: 'var(--ln-text-dim)' }}>{client.payoutNotes}</div>
          <div style={{ font: '500 11px/1.4 var(--ln-font-display)', color: 'var(--ln-text-muted)' }}>{client.affinityNotes}</div>
        </div>
      )}

      <button type="button" data-testid={`mission-detail-cta-${mission.id}`} disabled={!unlocked} onClick={() => unlocked && onPick()} className={styles.detailCta}>
        {ctaLabel}
      </button>

      {client && (
        <div className={styles.detailDisclaimer}>
          Changes this job&apos;s payout only — does not increase minerals mined.
        </div>
      )}
    </>
  )
}
