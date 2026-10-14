import type { WswBanner, WswChip } from '@/lib/wsw'
import styles from './WorldSpaceWeek.module.css'

/** World Space Week banner: dates, tier rule, and how many of its badges are earned. */
export function WorldSpaceWeekBanner({ banner, className }: { banner: WswBanner; className?: string }) {
  return (
    <div
      className={[styles.banner, className].filter(Boolean).join(' ')}
      data-testid="wsw-banner"
      data-live={banner.live}
      role="status"
    >
      <strong>{banner.title}</strong>
      <span>{banner.detail}</span>
      <span className={styles.count}>{banner.earned} / {banner.total} badges</span>
    </div>
  )
}

/** One chip per World Space Week category the thing can earn. Renders nothing when none apply. */
export function WorldSpaceWeekChips({ chips, className }: { chips: WswChip[]; className?: string }) {
  if (chips.length === 0) return null
  return (
    <ul className={[styles.chips, className].filter(Boolean).join(' ')} aria-label="World Space Week badges" data-testid="wsw-chips">
      {chips.map(chip => (
        <li key={chip.eventId} className={styles.chip} data-testid="wsw-chip" data-event-id={chip.eventId} data-state={chip.state}>
          <b>WSW</b>
          <span>{chip.label}</span>
        </li>
      ))}
    </ul>
  )
}
