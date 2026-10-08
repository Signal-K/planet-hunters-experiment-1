import { getSkyEvent, type PlayerBadge } from '@/lib/data/sky-events'
import styles from './SkyBadgeRow.module.css'

// SSL-491: compact earned-badge row. Renders nothing until a badge is earned.
export function SkyBadgeRow({ badges, className }: { badges?: Record<string, PlayerBadge>; className?: string }) {
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
          <span className={styles.tier}>{badge.tier === 'gold' ? 'Gold' : 'Silver'}</span>
          <span>{getSkyEvent(badge.eventId)?.name}</span>
        </li>
      ))}
    </ul>
  )
}
