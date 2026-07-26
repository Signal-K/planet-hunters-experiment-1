'use client'

import React from 'react'
import type { Mission, Client, MineralMeta } from '@/lib/data'
import TutorialHighlight from '@/components/game/TutorialHighlight'
import styles from '@/components/game/screens/MissionBoard.module.css'

type CardState = 'available' | 'locked' | 'cooldown' | 'completed'

interface MissionCardProps {
  mission: Mission
  client?: Client | null
  mineralMeta: Record<string, MineralMeta>
  targetCount: number
  displayPayout: number
  unlocked: boolean
  isStoryMission: boolean
  cardState: CardState
  lockedDetail?: string
  cooldownLabel?: string
  highlighted?: boolean
  previewed?: boolean
  routeLabel?: string
  // Commits immediately (navigates to Target) — matches the established
  // click-to-commit interaction asserted directly in
  // cypress/e2e/journeys/actual-play.cy.ts:63 and clean-start-loop.cy.ts:99.
  onPick: () => void
  // Hover/focus preview for the Contract Detail side panel — does not commit.
  onPreview?: () => void
}

export function missionCardTags({
  mission,
  client,
  isStoryMission,
  cardState,
  lockedDetail,
  cooldownLabel,
  routeLabel,
}: Pick<MissionCardProps, 'mission' | 'client' | 'isStoryMission' | 'cardState' | 'lockedDetail' | 'cooldownLabel' | 'routeLabel'>): { tone: 'burn' | 'job' | 'twostop'; label: string }[] {
  const difficultyTier = mission.difficulty.startsWith('L') ? parseInt(mission.difficulty.slice(1), 10) : NaN
  const fuelTimerLabel = routeLabel ? 'Two-leg burn' : mission.deliveryTargetId ? 'Delivery burn' : difficultyTier >= 3 ? 'Long burn' : 'Standard burn'
  if (cardState === 'cooldown' && cooldownLabel) return [{ tone: 'burn', label: `Cooldown · ${cooldownLabel}` }]
  if (cardState === 'locked') return [{ tone: 'job', label: lockedDetail ? `Locked · ${lockedDetail}` : 'Locked' }]
  if (cardState === 'completed') return [{ tone: 'job', label: 'Completed today' }]
  const tags: { tone: 'burn' | 'job' | 'twostop'; label: string }[] = [{ tone: 'burn', label: fuelTimerLabel }]
  if (routeLabel) tags.push({ tone: 'twostop', label: 'Two-stop job' })
  if (isStoryMission) tags.push({ tone: 'job', label: 'Story mission' })
  else if (client) tags.push({ tone: 'job', label: client.uiRole === 'bulk' ? 'Bulk freight' : 'Starter operations' })
  else tags.push({ tone: 'job', label: 'Self-directed' })
  return tags
}

const TAG_CLASS = { burn: styles.tagBurn, job: styles.tagJob, twostop: styles.tagTwostop }

export default function MissionCard({
  mission,
  client,
  mineralMeta,
  targetCount,
  displayPayout,
  unlocked,
  isStoryMission,
  cardState,
  lockedDetail,
  cooldownLabel,
  highlighted,
  previewed,
  routeLabel,
  onPick,
  onPreview,
}: MissionCardProps) {
  const accent = client?.color ?? '#6cd4ff'
  const isAvailable = cardState === 'available'
  const tags = missionCardTags({ mission, client, isStoryMission, cardState, lockedDetail, cooldownLabel, routeLabel })
  const statusCta = cardState === 'cooldown' ? 'Cooldown'
    : cardState === 'completed' ? 'Claimed'
    : cardState === 'locked' ? (lockedDetail ?? 'Locked')
    : ''
  const cardClass = [
    styles.card,
    previewed && styles.cardSelected,
    cardState === 'locked' && styles.cardLocked,
    cardState === 'cooldown' && styles.cardCooldown,
    cardState === 'completed' && styles.cardDone,
  ].filter(Boolean).join(' ')

  return (
    <button
      type="button"
      disabled={!unlocked}
      data-mission-id={mission.id}
      data-testid={`mission-card-${mission.id}`}
      onClick={() => unlocked && onPick()}
      onMouseEnter={onPreview}
      onFocus={onPreview}
      className={cardClass}
      style={{ position: 'relative' }}
    >
      {highlighted && <TutorialHighlight />}
      <div className={styles.mark} style={{ background: accent }}>{client?.initial ?? 'OP'}</div>
      <div className={styles.cardMain}>
        <div className={styles.cardTitle}>{mission.title}</div>
        <div className={styles.cardClient}>{client?.name ?? (isStoryMission ? 'Story mission' : 'Free Ops')}</div>
        <div className={styles.cardWants}>
          {isStoryMission
            ? 'Story mission · not a client request'
            : client
              ? <>Wants <b>{client.mineralPreferences.map(id => mineralMeta[id]?.name ?? id).join(' / ')}</b> · +{Math.round(client.payoutPremium * 100)}% pay</>
              : 'Choose target · keep the haul · market-led mining'}
        </div>
        {routeLabel && <div className={styles.cardRoute}>{routeLabel}</div>}
        <div className={styles.cardTags}>
          {tags.map((t, i) => <span key={i} className={`${styles.tag} ${TAG_CLASS[t.tone]}`}>{t.label}</span>)}
        </div>
      </div>
      <div className={styles.cardSide}>
        <div className={styles.cardPay}>
          <span className={styles.cardPayIcon}>▲</span>
          {cardState === 'completed' ? '—' : displayPayout.toLocaleString()}
        </div>
        {isAvailable ? (
          <span
            role="button"
            tabIndex={-1}
            data-testid={`mission-card-${mission.id}-cta`}
            onClick={e => { e.stopPropagation(); unlocked && onPick() }}
            className={styles.cardBtn}
          >
            {targetCount} target{targetCount !== 1 ? 's' : ''} ›
          </span>
        ) : (
          <span data-testid={`mission-card-${mission.id}-cta`} className={`${styles.cardBtn} ${styles.cardBtnDisabled}`}>
            {statusCta}
          </span>
        )}
      </div>
    </button>
  )
}
