'use client'

import React from 'react'
import type { Mission, Client, MineralMeta } from '@/lib/data'
import { isOwnProgramMission, missionDifficultyLabel, missionPayoutTier } from '@/lib/data'
import TutorialHighlight from '@/components/game/TutorialHighlight'
import ClientMark from '@/components/ui/ClientMark'
import styles from '@/components/game/screens/MissionBoard.module.css'
import { formatCurrency, FRANC } from '@/lib/format'

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
  crewStatus?: string
  crewReady?: boolean
  // Commits immediately (navigates to Target) — matches the established
  // click-to-commit interaction asserted directly in
  // cypress/e2e/journeys/actual-play.cy.ts:63 and clean-start-loop.cy.ts:99.
  onPick: () => void
  // Hover/focus preview for the Contract Detail side panel — does not commit.
  onPreview?: () => void
  // Opens the client dossier sheet (STS-235) — only offered for real client
  // requests, not own-program/story runs, which have no client to inspect.
  onOpenClientDossier?: (client: Client) => void
}

export function missionCardTags({
  mission,
  client,
  isStoryMission,
  cardState,
  lockedDetail,
  cooldownLabel,
  routeLabel,
  crewStatus,
  crewReady,
}: Pick<MissionCardProps, 'mission' | 'client' | 'isStoryMission' | 'cardState' | 'lockedDetail' | 'cooldownLabel' | 'routeLabel' | 'crewStatus' | 'crewReady'>): { tone: 'burn' | 'job' | 'twostop'; label: string }[] {
  const difficultyTier = mission.difficulty.startsWith('L') ? parseInt(mission.difficulty.slice(1), 10) : NaN
  const fuelTimerLabel = routeLabel ? 'Two-leg burn' : mission.deliveryTargetId ? 'Delivery burn' : difficultyTier >= 3 ? 'Long burn' : 'Standard burn'
  if (cardState === 'cooldown' && cooldownLabel) return [{ tone: 'burn', label: `Cooldown · ${cooldownLabel}` }]
  if (cardState === 'locked') return [{ tone: 'job', label: lockedDetail ? `Locked · ${lockedDetail}` : 'Locked' }]
  if (cardState === 'completed') return [{ tone: 'job', label: 'Completed today' }]
  const tags: { tone: 'burn' | 'job' | 'twostop'; label: string }[] = [{ tone: 'burn', label: fuelTimerLabel }]
  if (routeLabel) tags.push({ tone: 'twostop', label: 'Two-stop job' })
  // Own-program runs are the player's own operations — they get an ownership
  // tag, never a client-flavoured one, even when they are filed under the
  // Mission Control pseudo-client (see isOwnProgramMission).
  if (isOwnProgramMission(mission)) tags.push({ tone: 'job', label: 'Your operation' })
  else if (isStoryMission) tags.push({ tone: 'job', label: 'Story mission' })
  else if (client) tags.push({ tone: 'job', label: client.uiRole === 'bulk' ? 'Bulk freight' : 'Starter operations' })
  else tags.push({ tone: 'job', label: 'Self-directed' })
  return tags
}

const TAG_CLASS = { burn: styles.tagBurn, job: styles.tagJob, twostop: styles.tagTwostop }

export default function MissionCard({
  mission,
  client: clientProp,
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
  crewStatus,
  crewReady,
  onPick,
  onPreview,
  onOpenClientDossier,
}: MissionCardProps) {
  // An own-program run has no client, whatever the catalog filed it under.
  const ownOperation = isOwnProgramMission(mission)
  const client = ownOperation ? null : clientProp
  const accent = client?.color ?? '#6cd4ff'
  const isAvailable = cardState === 'available'
  const tags = missionCardTags({ mission, client, isStoryMission, cardState, lockedDetail, cooldownLabel, routeLabel, crewStatus, crewReady })
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
      {client && onOpenClientDossier ? (
        // A real <button> can't nest inside the card's own <button> (invalid
        // HTML, causes a hydration error) — same span+role pattern the CTA
        // below already uses for the same reason.
        <span
          role="button"
          tabIndex={-1}
          data-testid={`mission-card-${mission.id}-client-mark`}
          aria-label={`${client.name} dossier`}
          onClick={e => { e.stopPropagation(); onOpenClientDossier(client) }}
          style={{ cursor: 'pointer', flexShrink: 0 }}
        >
          <ClientMark initial={client.initial} color={accent} uiRole={client.uiRole} clientId={client.id} size={44} />
        </span>
      ) : (
        <ClientMark initial={client?.initial ?? 'OP'} color={accent} uiRole={client?.uiRole ?? 'starter'} clientId={client?.id} size={44} />
      )}
      <div className={styles.cardMain}>
        <div className={styles.cardTitle}>{mission.title}</div>
        <div className={styles.cardClient}>{client?.name ?? (ownOperation ? 'Your program' : 'Free Ops')}</div>
        <div className={styles.cardWants}>
          {mission.programReward
            ? `Program outcome · ${mission.programReward.outcome}`
            : ownOperation
            ? 'Your own operation · no client, no order to fill'
            : isStoryMission
            ? 'Story mission · not a client request'
            : client
              ? <>Wants <b>{client.mineralPreferences.map(id => mineralMeta[id]?.name ?? id).join(' / ')}</b> · +{Math.round(client.payoutPremium * 100)}% pay</>
              : 'Choose target · keep the haul · market-led mining'}
        </div>
        {routeLabel && <div className={styles.cardRoute}>{routeLabel}</div>}
        {crewStatus && (
          <div
            data-testid={`mission-card-${mission.id}-crew`}
            className={styles.cardRoute}
            style={{ color: crewReady ? 'var(--ln-ok)' : 'var(--ln-crimson)' }}
          >
            CREW · {crewStatus}
          </div>
        )}
        <div className={styles.cardTags}>
          {/* Difficulty was already computed per mission but never shown, so the
              progression curve was invisible on the board (STS-543). */}
          <span className={`${styles.tag} ${styles.tagLevel}`} data-testid={`mission-card-${mission.id}-difficulty`}>
            {mission.difficulty} · {missionDifficultyLabel(mission.difficulty)}
          </span>
          {tags.map((t, i) => <span key={i} className={`${styles.tag} ${TAG_CLASS[t.tone]}`}>{t.label}</span>)}
        </div>
      </div>
      <div className={styles.cardSide}>
        <div className={styles.cardPay}>
          {mission.programReward ? (
            <span data-testid={`mission-card-${mission.id}-program-reward`}>
              {mission.programReward.researchXP > 0
                ? `+${mission.programReward.researchXP} XP`
                : mission.targetId
                  ? 'FEED'
                  : 'TASK'}
            </span>
          ) : (
            <>
              <span className={styles.cardPayIcon}>{FRANC}</span>
              {cardState === 'completed' ? '—' : formatCurrency(displayPayout, { compact: true }).slice(FRANC.length)}
            </>
          )}
        </div>
        {cardState !== 'completed' && !mission.programReward && (
          <div className={styles.cardPayTier} data-testid={`mission-card-${mission.id}-payout-tier`}>
            {missionPayoutTier(mission)} payout
          </div>
        )}
        {isAvailable ? (
          <span
            role="button"
            tabIndex={-1}
            data-testid={`mission-card-${mission.id}-cta`}
            onClick={e => { e.stopPropagation(); unlocked && onPick() }}
            className={styles.cardBtn}
          >
            {targetCount === 0 && mission.programReward
              ? 'Open task ›'
              : `${targetCount} target${targetCount !== 1 ? 's' : ''} ›`}
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
