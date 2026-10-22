'use client'

import { communityBar, monthGrid, stampStreak, stampsInMonth, type ResearchStamps } from '@/lib/research/stamps'
import styles from './ResearchCalendar.module.css'

const DOW = ['M', 'T', 'W', 'T', 'F', 'S', 'S']
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

/** SSL-663: stamp calendar for the current UTC month and the community bar everyone's stamps add to. `communityOthers` stays a placeholder until the total is served. */
export function ResearchCalendar({ stamps, now, communityOthers = 0 }: { stamps?: ResearchStamps; now: number; communityOthers?: number }) {
  const d = new Date(now)
  const year = d.getUTCFullYear()
  const month = d.getUTCMonth()
  const weeks = monthGrid(year, month, stamps, now)
  const streak = stampStreak(stamps, now)
  const own = stampsInMonth(stamps, year, month)
  const bar = communityBar(own, communityOthers)
  return (
    <section className={styles.plate} data-testid="research-calendar" aria-label="Research calendar">
      <div className={styles.head}>
        <h2 className={styles.title}>Research log, {MONTHS[month]}</h2>
        <span className={styles.streak} data-testid="research-streak">{streak > 0 ? `${streak} day${streak === 1 ? '' : 's'} running` : 'No streak yet'}</span>
      </div>
      <div className={styles.grid} role="grid">
        {DOW.map((l, i) => <div key={i} className={styles.dow} aria-hidden>{l}</div>)}
        {weeks.flat().map((c, i) => c
          ? (
            <div key={c.key} role="gridcell" className={styles.day} data-testid={`research-day-${c.day}`}
              data-stamped={c.kinds.length > 0} data-today={c.today} data-future={c.future}
              aria-label={`${MONTHS[month]} ${c.day}${c.kinds.length ? `, ${c.kinds.length} research task${c.kinds.length === 1 ? '' : 's'} stamped` : ''}`}>
              {c.day}
              {c.kinds.length > 1 && <span className={styles.stampMark} aria-hidden />}
            </div>
          )
          : <div key={`gap-${i}`} aria-hidden />)}
      </div>
      <div className={styles.bar} data-testid="research-community-bar">
        <div className={styles.barLabel}>
          <span>Community stamps this month</span>
          <span>{bar.total} / {bar.goal}</span>
        </div>
        <div className={styles.track} role="progressbar" aria-valuemin={0} aria-valuemax={bar.goal} aria-valuenow={bar.total} aria-label="Community stamps"><div className={styles.fill} style={{ width: `${bar.fill * 100}%` }} /></div>
        <p className={styles.note}>{bar.reached ? `Goal reached: +${bar.bonusPct}% weekly revenue.` : `Reach the goal for +${bar.bonusPct}% weekly revenue (placeholder).`}</p>
      </div>
    </section>
  )
}
