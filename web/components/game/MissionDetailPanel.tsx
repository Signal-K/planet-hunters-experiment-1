'use client'

import React from 'react'
import type { Mission, Client, MineralMeta } from '@/lib/data'
import { isOwnProgramMission } from '@/lib/data'
import MineralChip from '@/components/game/MineralChip'
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
  startBlocked?: boolean
  startBlockedLabel?: string
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
  startBlocked = false,
  startBlockedLabel = 'Mission in progress',
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
  const cargoUnits = Object.values(mission.requires.minerals).reduce((sum, n) => sum + n, 0)
  const isAvailable = cardState === 'available'
  const canPick = isAvailable && !startBlocked
  const ctaLabel = cardState === 'cooldown' ? (cooldownLabel ? `Cooldown · ${cooldownLabel}` : 'On cooldown')
    : cardState === 'locked' ? (lockedDetail ? `Locked · ${lockedDetail}` : 'Locked')
    : cardState === 'completed' ? 'Completed today'
    : startBlocked ? startBlockedLabel
    : `Continue · ${targetCount} target${targetCount !== 1 ? 's' : ''}`

  // Title, client, route, difficulty, payout tier, and pay-premium already
  // read directly off the card this panel previews (STS-282) — repeating
  // them here was the literal duplication the board audit flagged. This
  // panel now surfaces only what the card has no room for: cargo load,
  // affinity reward, the mineral-by-mineral requirement breakdown, flavor
  // text, and the client's own notes.
  return (
    <>
      <div className={styles.detailRow}>
        <span className={styles.detailChip}><b>{cargoUnits}U</b>&nbsp;Cargo</span>
        {mission.programReward && (
          <span className={styles.detailChip} data-testid={`mission-detail-program-reward-${mission.id}`}>
            <b>+{mission.programReward.researchXP}</b>&nbsp;Research XP
          </span>
        )}
        {!isStoryMission && client && <span className={`${styles.detailChip} ${styles.detailChipAff}`}><b>+{affinityReward}</b>&nbsp;Affinity</span>}
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

      {/* The payout-modifier disclaimer already runs once above the Mission
          Type primer whenever any client contract is on the board (STS-282)
          — repeating it per-selection here was the same duplication this
          panel was trimmed of above. */}
      <button type="button" data-testid={`mission-detail-cta-${mission.id}`} disabled={!canPick} onClick={() => canPick && onPick()} className={styles.detailCta}>
        {ctaLabel}
      </button>
    </>
  )
}
