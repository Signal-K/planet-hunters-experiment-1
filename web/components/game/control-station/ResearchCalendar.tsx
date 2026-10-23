'use client'

import { dailyTasksFor, RESEARCH_BLURB, RESEARCH_TITLE, communityBar, monthGrid, stampDayKey, stampStreak, stampsInMonth, type CommunityResearch, type ResearchStamps } from '@/lib/research/stamps'
import styles from './ResearchCalendar.module.css'

const formatBonusEnd = (at: number) => { const d = new Date(at); return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}` }

const DOW = ['M', 'T', 'W', 'T', 'F', 'S', 'S']
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

/** SSL-663: stamp calendar for the current UTC month. SSL-673: the community bar adds every other player's stamps from the server. */
export function ResearchCalendar({ stamps, now, community, hasDiscovery = false }: { stamps?: ResearchStamps; now: number; community?: CommunityResearch | null; hasDiscovery?: boolean }) {
  const d = new Date(now)
  const year = d.getUTCFullYear()
  const month = d.getUTCMonth()
  const weeks = monthGrid(year, month, stamps, now)
  const streak = stampStreak(stamps, now)
  const own = stampsInMonth(stamps, year, month)
  const bar = communityBar(own, community)
  const bonusOpen = bar.bonusUntil != null && now < bar.bonusUntil
  return (
    <section className={styles.plate} data-testid="research-calendar" aria-label="Research calendar">
      <div className={styles.head}>
        <h2 className={styles.title}>{RESEARCH_TITLE}</h2>
        <span className={styles.streak} data-testid="research-streak">{streak > 0 ? `${streak} day${streak === 1 ? '' : 's'} running` : 'No streak yet'}</span>
      </div>
      <p className={styles.note} data-testid="research-blurb">{RESEARCH_BLURB}</p>
      <ul className={styles.tasks} aria-label="Today's research">
        {dailyTasksFor(hasDiscovery).map(t => {
          const done = (stamps?.[stampDayKey(now)] ?? []).includes(t.kind)
          return (
            <li key={t.kind} className={styles.task} data-testid={`research-task-${t.kind}`} data-done={done}>
              <span className={styles.taskMark} aria-hidden />
              <span>{t.label}</span>
              <span className={styles.taskState}>{done ? 'Stamped' : 'Open'}</span>
            </li>
          )
        })}
      </ul>
      <div className={styles.monthLabel}>{MONTHS[month]} {year}</div>
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
        <p className={styles.note} data-testid="research-community-state" data-state={bonusOpen ? 'bonus' : bar.reached ? 'spent' : 'filling'}>
          {bonusOpen
            ? `Goal reached. Exchange sales pay +${bar.bonusPct}% until ${formatBonusEnd(bar.bonusUntil!)}.`
            : bar.reached
              ? `Goal reached this month. The +${bar.bonusPct}% week has ended.`
              : `Fill the bar together and everyone's Exchange sales pay +${bar.bonusPct}% for a week.`}
        </p>
      </div>
    </section>
  )
}
