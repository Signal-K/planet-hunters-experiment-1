'use client'

import { useState } from 'react'
import { shareBadge } from '@/lib/share'
import { getSkyEvent, type PlayerBadge } from '@/lib/data/sky-events'
import { ORIONIDS_VARIANTS } from '@/lib/orionids/theme'
import styles from './SkyBadgeRow.module.css'

// SSL-491: compact earned-badge row. Renders nothing until a badge is earned.
// Orionids uses its medallion. Gold is the event-window tier; silver is the
// same medallion in grayscale for a completion after the window (SSL-475).
const ORIONIDS_BADGE = ORIONIDS_VARIANTS.blueprint.badgeSmall

export function SkyBadgeRow({ badges, className }: { badges?: Record<string, PlayerBadge>; className?: string }) {
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const earned = Object.values(badges ?? {})
    .filter(badge => getSkyEvent(badge.eventId))
    .sort((a, b) => a.earnedAt - b.earnedAt)
  if (earned.length === 0) return null
  return (
    <ul className={`${styles.row} ${className ?? ''}`} aria-label="Sky event badges" data-testid="sky-badge-row">
      {earned.map(badge => (
        <li
          key={badge.eventId}
          className={`${styles.badge} ${badge.tier === 'gold' ? styles.gold : styles.silver}`}
          data-testid="sky-badge"
          data-tier={badge.tier}
        >
          {badge.eventId === 'orionids-2026' && (
            <img className={styles.medallion} src={ORIONIDS_BADGE} alt="" data-tier={badge.tier} />
          )}
          <span className={styles.tier}>{badge.tier === 'gold' ? 'Gold' : 'Silver'}</span>
          <span>{getSkyEvent(badge.eventId)?.name}</span>
          <button
            type="button"
            className={styles.share}
            data-testid="sky-badge-share"
            onClick={async () => {
              const result = await shareBadge(getSkyEvent(badge.eventId)?.name ?? '', badge.tier)
              if (result === 'copied') setCopiedId(badge.eventId)
            }}
          >
            {copiedId === badge.eventId ? 'Link copied' : 'Share'}
          </button>
        </li>
      ))}
    </ul>
  )
}
