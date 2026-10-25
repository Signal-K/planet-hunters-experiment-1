'use client'

import { useState } from 'react'
import { GalaxyMap } from '@/components/game/MissionBoard'
import ClientMark from '@/components/ui/ClientMark'
import { liveEventWeek } from '@/lib/research/event-week'
import { communityBar, stampDayKey, stampStreak, stampsInMonth, type CommunityResearch, type StampKind } from '@/lib/research/stamps'
import type { Player } from '@/lib/game-types'
import board from '@/components/game/MissionBoard.module.css'
import styles from './CommunityResearchScreen.module.css'

interface CommunityResearchScreenProps {
  player: Player
  communityResearch?: CommunityResearch | null
  onBack: () => void
  /** Jump into the flow that earns this stamp. */
  onGo: (kind: StampKind) => void
}

interface ResearchTask { kind: StampKind; mark: string; color: string; eyebrow: string; title: string; brief: string }

const DAY_MS = 86_400_000
const DOW = ['M', 'T', 'W', 'T', 'F', 'S', 'S']

/** The seven UTC days of the week containing `now`, Monday first. */
function weekDays(now: number): { key: string; letter: string; today: boolean; future: boolean }[] {
  const today = stampDayKey(now)
  const offset = (new Date(now).getUTCDay() + 6) % 7
  return Array.from({ length: 7 }, (_, i) => {
    const key = stampDayKey(now - (offset - i) * DAY_MS)
    return { key, letter: DOW[i], today: key === today, future: key > today }
  })
}

function tasksFor(player: Player, eventName: string | null): ResearchTask[] {
  const tasks: ResearchTask[] = []
  if (eventName) tasks.push({
    kind: 'event', mark: 'EV', color: '#e8a24a', eyebrow: `${eventName} week · live`, title: `Catch debris in the ${eventName}`,
    brief: `Everyone is out there this week. Fly the shower run, catch fragments and bring a stamp home for the whole community.`,
  })
  tasks.push(
    { kind: 'classification', mark: 'CL', color: '#58d0ea', eyebrow: 'Daily task', title: 'Classify a signal', brief: 'Open your instruments, pick something your telescopes found and say what it is.' },
    { kind: 'survey', mark: 'SV', color: '#9ad28a', eyebrow: 'Daily task', title: 'Finish a survey scan', brief: 'Start a scan from the control station and see it through to the result.' },
  )
  if (Object.keys(player.discoveredExoplanetTargets ?? {}).length > 0) tasks.push({
    kind: 'discovery-mission', mark: 'DS', color: '#c9a7f0', eyebrow: 'Daily task', title: 'Survey your discovery', brief: 'Fly a survey to a world you found yourself.',
  })
  return tasks
}

/** Community research as a mission board: research tasks on the left, the chosen one in the middle, your week and the way in on the right. */
export default function CommunityResearchScreen({ player, communityResearch, onBack, onGo }: CommunityResearchScreenProps) {
  const now = Date.now()
  const week = liveEventWeek(now)
  const tasks = tasksFor(player, week?.name ?? null)
  const [picked, setPicked] = useState<StampKind>(tasks[0].kind)
  const task = tasks.find(t => t.kind === picked) ?? tasks[0]
  const stamps = player.researchStamps ?? {}
  const todayKinds = stamps[stampDayKey(now)] ?? []
  const days = weekDays(now)
  const stampedDays = days.filter(d => (stamps[d.key] ?? []).length > 0).length
  const d = new Date(now)
  const bar = communityBar(stampsInMonth(stamps, d.getUTCFullYear(), d.getUTCMonth()), communityResearch)
  const done = todayKinds.includes(task.kind)
  const streak = stampStreak(stamps, now)
  return (
    <div className={board.scene} data-testid="community-research-screen" data-screen="community-research">
      <section className={board.dispatch} style={{ '--signal': task.color } as React.CSSProperties} aria-label="Community research">
        <nav className={board.rail} aria-label="Community research">
          <button type="button" className={`${board.round} ${board.railClose}`} data-testid="community-research-back" aria-label="Close" onClick={onBack}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 6 9 12l6 6" /></svg>
          </button>
          <button type="button" className={board.tab} data-active="true" data-tab="research" aria-label="Community research">
            <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="3" /><path d="M12 3v3M12 18v3M3 12h3M18 12h3" /></svg>
            <span className={board.tabLabel}>Community research</span>
          </button>
        </nav>
        <GalaxyMap targets={[]} mode="ambient" view="belt" onView={() => {}} />
        <article className={styles.workspace} data-testid="community-research-board">
          <section className={styles.left}>
            <div className={`${board.contractOffers} ${styles.tiles}`} aria-label="Research tasks">
              <div className={board.offerStrip}>
                {tasks.map(t => (
                  <button key={t.kind} type="button" data-selected={t.kind === task.kind || undefined} aria-label={`Select ${t.title}`}
                    data-testid={`research-task-${t.kind}`} data-done={todayKinds.includes(t.kind)} onClick={() => setPicked(t.kind)}>
                    <ClientMark initial={t.mark} color={t.color} uiRole="starter" size={34} />
                    <span>{todayKinds.includes(t.kind) ? '✓' : ''}</span>
                  </button>
                ))}
              </div>
            </div>
            <div className={styles.focus}>
              <ClientMark initial={task.mark} color={task.color} uiRole="starter" size={68} />
              <span className={styles.eyebrow}>{task.eyebrow}</span>
              <h2 data-testid="community-research-title">{task.title}</h2>
              <p>{task.brief}</p>
              <small data-testid="community-research-state">{done ? 'Stamped today' : 'Open today'}</small>
            </div>
          </section>
          <section className={styles.right}>
            <h2>This week</h2>
            <div className={styles.week} role="list" aria-label="This week" data-testid="community-research-week">
              {days.map(day => (
                <div key={day.key} role="listitem" className={styles.day} data-stamped={(stamps[day.key] ?? []).length > 0} data-today={day.today} data-future={day.future}
                  aria-label={`${day.key}${(stamps[day.key] ?? []).length ? ', stamped' : ''}`}>
                  <i aria-hidden="true" />
                  <span>{day.letter}</span>
                </div>
              ))}
            </div>
            <div className={styles.facts} data-testid="community-research-facts">
              <b>{stampedDays} of 7 days</b>
              <em>{streak > 0 ? `${streak} day${streak === 1 ? '' : 's'} running` : 'Start a streak today'}</em>
            </div>
            <div className={styles.bar} data-testid="research-community-bar">
              <div className={styles.barLabel}><span>Community</span><span>{bar.total} / {bar.goal}</span></div>
              <div className={styles.track} role="progressbar" aria-valuemin={0} aria-valuemax={bar.goal} aria-valuenow={bar.total} aria-label="Community stamps">
                <div className={styles.fill} style={{ width: `${bar.fill * 100}%` }} />
              </div>
              <small>Fill it together: everyone sells for +{bar.bonusPct}% for a week.</small>
            </div>
            <button type="button" className={board.contractTake} data-testid="community-research-go" onClick={() => onGo(task.kind)}>
              {task.kind === 'event' ? 'JOIN' : 'GO'}
            </button>
          </section>
        </article>
      </section>
    </div>
  )
}
