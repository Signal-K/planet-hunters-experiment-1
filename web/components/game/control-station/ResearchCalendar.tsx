'use client'

import { dailyTasksFor, RESEARCH_TITLE, communityBar, stampDayKey, stampStreak, stampsInMonth, type CommunityResearch, type ResearchStamps } from '@/lib/research/stamps'
import styles from './ResearchCalendar.module.css'

const DAY_MS = 86_400_000
const DOW = ['M', 'T', 'W', 'T', 'F', 'S', 'S']

/** SSL-663: this week's research stamps. SSL-673: the community bar adds every other player's stamps from the server.
 *  The full month lives in Community research; the Control Station shows the week, today's state and the bar. */
export function ResearchCalendar({ stamps, now, community, hasDiscovery = false }: { stamps?: ResearchStamps; now: number; community?: CommunityResearch | null; hasDiscovery?: boolean }) {
  const d = new Date(now)
  const streak = stampStreak(stamps, now)
  const bar = communityBar(stampsInMonth(stamps, d.getUTCFullYear(), d.getUTCMonth()), community)
  const today = stampDayKey(now)
  const offset = (d.getUTCDay() + 6) % 7
  const week = DOW.map((letter, i) => {
    const key = stampDayKey(now - (offset - i) * DAY_MS)
    return { key, letter, stamped: (stamps?.[key] ?? []).length > 0, today: key === today, future: key > today }
  })
  const stampedToday = (stamps?.[today] ?? []).length > 0
  const tasks = dailyTasksFor(hasDiscovery).map(t => t.label.replace(/^./, c => c.toLowerCase()))
  return (
    <section className={styles.plate} data-testid="research-calendar" aria-label="Research calendar">
      <div className={styles.head}>
        <h2 className={styles.title}>{RESEARCH_TITLE}</h2>
        <span className={styles.streak} data-testid="research-streak">{streak > 0 ? `${streak} day${streak === 1 ? '' : 's'} running` : 'No streak yet'}</span>
      </div>
      <ol className={styles.week} aria-label="This week">
        {week.map(day => (
          <li key={day.key} className={styles.day} data-testid={`research-day-${Number(day.key.slice(8))}`} data-stamped={day.stamped} data-today={day.today} data-future={day.future}>
            <i aria-hidden="true" />{day.letter}
          </li>
        ))}
      </ol>
      <p className={styles.note} data-testid="research-today" data-done={stampedToday}>
        {stampedToday ? 'Today is stamped.' : `To stamp today: ${tasks.join(', ')}.`}
      </p>
      <div className={styles.bar} data-testid="research-community-bar">
        <div className={styles.barLabel}>
          <span>Community</span>
          <span>{bar.total} / {bar.goal}</span>
        </div>
        <div className={styles.track} role="progressbar" aria-valuemin={0} aria-valuemax={bar.goal} aria-valuenow={bar.total} aria-label="Community stamps"><div className={styles.fill} style={{ width: `${bar.fill * 100}%` }} /></div>
      </div>
    </section>
  )
}
