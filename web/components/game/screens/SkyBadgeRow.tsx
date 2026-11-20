'use client'

import { useState } from 'react'
import { shareBadge } from '@/lib/share'
import { getSkyEvent, type PlayerBadge } from '@/lib/data/sky-events'
import { getWswBadge } from '@/lib/data/wsw-badges'
import { ORIONIDS_VARIANTS } from '@/lib/orionids/theme'
import styles from './SkyBadgeRow.module.css'
import { useSpriteFailure } from '@/components/game/hub/useSpriteFailure'

// SSL-491: compact earned-badge row. Renders nothing until a badge is earned.
// Orionids uses its medallion. Gold is the event-window tier; silver is the
// same medallion in grayscale for a completion after the window (SSL-475).
const ORIONIDS_BADGE = ORIONIDS_VARIANTS.blueprint.badgeSmall

export function SkyBadgeRow({ badges, className, history = false }: { badges?: Record<string, PlayerBadge>; className?: string; history?: boolean }) {
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const earned = Object.values(badges ?? {})
    .filter(badge => getSkyEvent(badge.eventId) || getWswBadge(badge.eventId))
    .sort((a, b) => a.earnedAt - b.earnedAt)
  if (earned.length === 0) return null
  const list = (
    <ul className={`${styles.row} ${history ? styles.history : className ?? ''}`} aria-label="Sky event badges" data-testid="sky-badge-row">
      {earned.map(badge => {
        const wsw = getWswBadge(badge.eventId)
        const badgeName = wsw?.name ?? getSkyEvent(badge.eventId)?.name ?? ''
        return (
        <li
          key={badge.eventId}
          className={`${styles.badge} ${badge.tier === 'gold' ? styles.gold : styles.silver}`}
          data-testid="sky-badge"
          data-tier={badge.tier}
          data-wsw-tone={wsw?.tone}
          title={wsw ? `World Space Week 2026: ${getSkyEvent(wsw.eventId)?.name} (our own category)` : undefined}
        >
          <BadgeMedallion orionids={badge.eventId === 'orionids-2026'} tier={badge.tier} />
          <div className={styles.caption}>
            <span className={styles.tier}>{badge.tier === 'gold' ? 'Gold' : 'Silver'}{wsw ? ' · WSW' : ''}</span>
            <span className={styles.name}>{badgeName}</span>
          </div>
          <button
            type="button"
            className={styles.share}
            data-testid="sky-badge-share"
            aria-label={`Share ${badgeName} ${badge.tier} badge`}
            onClick={async () => {
              const result = await shareBadge(badgeName, badge.tier)
              if (result === 'copied') setCopiedId(badge.eventId)
            }}
          >
            {copiedId === badge.eventId ? 'Link copied' : 'Share'}
          </button>
        </li>
        )
      })}
    </ul>
  )
  return history ? <section className={className} aria-label="Badge collection">
    <h3 className={styles.heading}>Badge collection</h3>
    <p className={styles.historyNote}>Earned across all your missions.</p>
    {list}
  </section> : list
}

function BadgeMedallion({ orionids, tier }: { orionids: boolean; tier: string }) {
  const sprite = useSpriteFailure(ORIONIDS_BADGE)
  if (orionids && !sprite.failed) return <img ref={sprite.image} onError={sprite.onError} className={styles.medallion} src={ORIONIDS_BADGE} alt="" data-tier={tier} />
  return <svg className={styles.medallion} viewBox="0 0 32 32" aria-hidden="true" data-tier={tier}>
    <path d="m10 19-3 11 9-4 9 4-3-11" fill="var(--ln-blueprint-blue)" />
    <circle cx="16" cy="13" r="10" fill="var(--ln-blueprint-ink)" stroke="var(--ln-cyan)" strokeWidth="2" />
    <path d="m16 6 2 4 5 1-4 3 1 5-4-2-4 2 1-5-4-3 5-1Z" fill="var(--ln-map-sun)" />
  </svg>
}
