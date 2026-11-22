'use client'
import { useState } from 'react'
import type { Player } from '@/lib/game-types'
import { customizerPartById } from '@/lib/data/shipCustomizer'
import { weeklyRocketPart } from '@/lib/data/weeklyRocketParts'
import { weekKey } from '@/lib/research/paths'
import { passportDays, passportWeekRange, STAMP_LABELS } from '@/lib/research/passport'
import type { StampKind } from '@/lib/research/stamps'
import styles from './ResearchPassport.module.css'
const PROJECT_LABEL: Record<string, string> = { 'exoplanet-hunters': 'Transit', 'asteroid-discovery': 'Asteroid', 'saturn-storms': 'Saturn', 'deposit-survey': 'Probe', 'meteor-echoes': 'Meteor' }

export default function ResearchPassport({ player, onBack, onActivities, onGo, onWorkshop, status }: {
  player: Player; onBack: () => void; onActivities: () => void; onGo: (kind: StampKind) => void; onWorkshop: () => void
  status?: 'loading' | 'live' | 'offline' | 'signed-out'
}) {
  const now = Date.now()
  const weeks = passportWeekRange(player, now)
  const [selectedWeek, setSelectedWeek] = useState<string | null>(null)
  const week = selectedWeek && weeks.includes(selectedWeek) ? selectedWeek : weekKey(now)
  const index = weeks.indexOf(week)
  const current = week === weekKey(now)
  const days = passportDays(player, week, now)
  const label = (day: typeof days[number]) => day.kind === 'classification' ? PROJECT_LABEL[player.researchStampProjects?.[day.key]?.[day.kind] ?? ''] ?? STAMP_LABELS[day.kind] : day.kind ? STAMP_LABELS[day.kind] : ''
  const mine = days.filter(day => !!day.kind).length
  const confirmed = player.researchPassportWeeks?.[week]
  const pending = current ? Math.max(0, mine - (confirmed?.mine ?? 0)) : 0
  const total = (confirmed?.total ?? 0) + pending
  const goal = confirmed?.goal ?? 100
  const part = weeklyRocketPart(week)
  const owned = !!confirmed?.earned && !!part && (player.researchRocketParts ?? []).includes(part.id)
  const contributed = mine > 0 || (confirmed?.mine ?? 0) > 0
  const date = (key: string) => new Date(`${key}T00:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' })
  const rewardLine = owned ? 'Part earned · ready in the workshop'
    : confirmed?.reachedAt != null ? (pending ? 'Your stamp is waiting to sync. The part unlocks after it is confirmed.' : contributed ? 'Confirming your part…' : current ? 'Goal reached. Add one research stamp this week to earn the part.' : 'Goal reached · you did not contribute this week.')
      : current && pending > 0 && total >= goal ? 'Waiting for synced stamps. The shared goal and reward will be confirmed online.' : current ? 'The community goal unlocks this part for everyone who contributes at least one stamp this week.' : 'The community goal was not reached. This week’s part was not earned.'
  return <div className={`game-screen ${styles.desk}`} data-testid="community-research-screen" data-screen="community-research">
    <header className={styles.header}>
      <button onClick={onBack} data-testid="community-research-back">‹ Base</button>
      <div><span>COMMUNITY RESEARCH</span><h1>Research passport</h1></div>
      <button onClick={onActivities} data-testid="passport-activities">Activities & community</button>
    </header>
    <main className={styles.book} data-testid="research-passport">
      <section className={styles.page} aria-label="Weekly passport page">
        <nav className={styles.paging} aria-label="Passport pages">
          <button aria-label="Previous week" disabled={index < 0 || index >= weeks.length - 1} onClick={() => setSelectedWeek(weeks[index + 1])}>‹</button>
          <div><span>{current ? 'THIS WEEK' : 'PASSPORT ARCHIVE'}</span><h2>{date(week)} – {date(days[6].key)}</h2></div>
          <button aria-label="Next week" disabled={index <= 0} onClick={() => setSelectedWeek(weeks[index - 1])}>›</button>
        </nav>
        <p>One place for each day. Your first research action inks the day; extra work keeps helping.</p>
        <ol className={styles.stamps} aria-label="Seven daily stamp places" data-testid="community-research-week">
          {days.map((day, i) => <li key={day.key} className={styles.stamp} data-stamped={!!day.kind} data-today={day.today} data-future={day.future} title={day.kind ? player.researchStampProjects?.[day.key]?.[day.kind]?.replaceAll('-', ' ') : undefined} aria-label={`${['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'][i]}, ${date(day.key)}: ${day.kind ? label(day) : day.future ? 'not yet open' : 'empty'}`}>
            <span>{['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'][i]}</span>
            <div className={styles.ink}>{day.kind ? <><b aria-hidden="true">{day.kind === 'event' ? '☄' : day.kind === 'survey' ? '◎' : day.kind === 'gift' ? '◇' : '✦'}</b><strong>{label(day)}</strong><small>{date(day.key)}</small></> : <><b aria-hidden="true">{day.future ? '·' : '○'}</b><small>{day.today ? 'Today' : day.future ? 'To come' : 'Open'}</small></>}</div>
          </li>)}
        </ol>
        <p className={styles.contribution} data-testid="passport-contribution">{contributed ? `You contributed · ${Math.max(mine, confirmed?.mine ?? 0)} of 7 days inked` : current ? 'No contribution yet this week.' : 'No contribution recorded for this week.'}{pending > 0 && <span> {pending} day{pending === 1 ? '' : 's'} waiting to sync.</span>}</p>
        {current && <div className={styles.actions} aria-label="Earn a research stamp">
          <button onClick={() => onGo('classification')}>Classify a signal</button><button onClick={() => onGo('survey')}>Survey a world</button><button onClick={() => onGo('review')}>Review a finding</button>
        </div>}
      </section>
      <section className={styles.rewardPage} aria-label="Weekly community reward">
        <span className={styles.kicker}>WEEKLY ROCKET PART / {week}</span>
        <div className={styles.partDrawing}>{part && <img src={customizerPartById(part.id)?.img} alt={part.name} />}</div>
        <h2 data-testid="passport-part">{part?.name.split(' · ')[0] ?? 'Research archive'}</h2>
        <p>One new issue each week. Earn it once, keep it, and fit it for free.</p>
        <div className={styles.bar} data-testid="research-community-bar">
          <div><strong>{confirmed?.reachedAt != null ? 'Community goal reached' : 'Shared weekly goal'}</strong><span>{total} / {goal}</span></div>
          <progress value={Math.min(total, goal)} max={goal} aria-label="Weekly community stamps" />
          <small>{confirmed ? `${confirmed.total} confirmed stamps${pending ? ` + ${pending} waiting to sync` : ''}` : status === 'signed-out' ? 'Sign in to see the shared total.' : status === 'offline' ? 'Offline · shared total will refresh when connected.' : 'Waiting for the shared total…'}</small>
        </div>
        <p className={styles.rewardStatus} data-testid="passport-reward-status">{rewardLine}</p>
        {owned && <button onClick={onWorkshop} data-testid="passport-workshop">Fit in rocket workshop →</button>}
        {status === 'offline' && confirmed && <p>Offline · showing the last confirmed page.</p>}
        <div className={styles.seal}>{owned ? 'PART EARNED' : contributed ? 'CONTRIBUTOR' : 'RESEARCH PASSPORT'}</div>
      </section>
    </main>
  </div>
}
