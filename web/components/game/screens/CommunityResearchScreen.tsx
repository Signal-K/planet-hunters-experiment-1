'use client'

import { useState } from 'react'
import { GalaxyMap } from '@/components/game/MissionBoard'
import { liveEventWeek } from '@/lib/research/event-week'
import { communityBar, stampDayKey, stampsInMonth, type CommunityResearch, type StampKind } from '@/lib/research/stamps'
import { explorerSteps, pathThisWeek, stepProgress, weekKey, type PathStep, type ResearchPathId } from '@/lib/research/paths'
import type { Player } from '@/lib/game-types'
import board from '@/components/game/MissionBoard.module.css'
import styles from './CommunityResearchScreen.module.css'

interface CommunityResearchScreenProps {
  player: Player
  communityResearch?: CommunityResearch | null
  onBack: () => void
  onChoosePath: (path: ResearchPathId) => void
  /** Jump into the flow that earns this stamp. */
  onGo: (kind: StampKind) => void
}

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

const ICONS: Record<PathStep['icon'], string> = {
  signal: 'M3 12h4l2-6 4 12 2-6h6',
  scan: 'M4 8V4h4M16 4h4v4M20 16v4h-4M8 20H4v-4M8 12h8',
  world: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18ZM3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18',
  sky: 'M4 20 16 8M10 4l1 3 3 1-3 1-1 3-1-3-3-1 3-1ZM17 13l.7 2 2 .7-2 .7-.7 2-.7-2-2-.7 2-.7Z',
  star: 'm12 3 2.6 5.6 6 .7-4.5 4.1 1.2 6L12 16.4 6.7 19.4l1.2-6L3.4 9.3l6-.7Z',
}
function StepIcon({ icon, size = 28 }: { icon: PathStep['icon']; size?: number }) {
  return <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={ICONS[icon]} /></svg>
}

const HOW_IT_WORKS = [
  'Pick a path. It is locked for the week and resets on Monday.',
  'Finish its five steps in any order. Missing a day costs nothing.',
  'Every step is a stamp that also fills the shared community bar.',
]

/** Community research as a mission board: research tasks on the left, the chosen one in the middle, your week and the way in on the right. */
export default function CommunityResearchScreen({ player, communityResearch, onBack, onChoosePath, onGo }: CommunityResearchScreenProps) {
  const now = Date.now()
  const event = liveEventWeek(now)
  const path = pathThisWeek(player.researchPath, now)
  const week = weekKey(now)
  const steps = explorerSteps({ hasDiscovery: Object.keys(player.discoveredExoplanetTargets ?? {}).length > 0, eventName: event?.name ?? null })
  const stamps = player.researchStamps ?? {}
  const progress = steps.map(st => stepProgress(st, stamps, week, now))
  const firstOpen = Math.max(0, progress.findIndex(p => p.have < p.need))
  const [picked, setPicked] = useState<number | null>(null)
  const at = Math.min(picked ?? firstOpen, steps.length - 1)
  const step = steps[at]
  const days = weekDays(now)
  const stampedDays = days.filter(d => (stamps[d.key] ?? []).length > 0).length
  const d = new Date(now)
  const bar = communityBar(stampsInMonth(stamps, d.getUTCFullYear(), d.getUTCMonth()), communityResearch)
  const finished = progress.filter(p => p.have >= p.need).length
  const color = path ? step.color : '#58d0ea'
  return (
    <div className={board.scene} data-testid="community-research-screen" data-screen="community-research">
      <section className={board.dispatch} style={{ '--signal': color } as React.CSSProperties} aria-label="Community research">
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
          {path === null ? (
            <>
              <section className={styles.left} data-testid="community-research-picker">
                <div className={styles.paths}>
                  <button type="button" className={styles.path} data-selected="true" data-testid="research-path-explorer" aria-label="Explorer path"><StepIcon icon="scan" size={34} /><span>Explorer</span></button>
                  <button type="button" className={styles.path} disabled data-testid="research-path-trader" aria-label="Trader path, coming soon"><StepIcon icon="world" size={34} /><span>Trader</span><small>Soon</small></button>
                  <button type="button" className={styles.path} disabled data-testid="research-path-agency" aria-label="Agency path, locked"><StepIcon icon="star" size={34} /><span>Agency</span><small>Locked</small></button>
                </div>
                <div className={styles.focus}>
                  <span className={styles.eyebrow}>This week\u2019s path</span>
                  <h2 data-testid="community-research-title">Explorer</h2>
                  <p>Classify signals, scan worlds and chase the sky. Five steps, and the research helps everyone.</p>
                </div>
              </section>
              <section className={styles.right}>
                <h2>How it works</h2>
                <ol className={styles.how} data-testid="community-research-how">
                  {HOW_IT_WORKS.map(line => <li key={line}>{line}</li>)}
                </ol>
                <button type="button" className={board.contractTake} data-testid="community-research-choose" onClick={() => onChoosePath('explorer')}>START</button>
              </section>
            </>
          ) : (
            <>
              <section className={styles.left}>
                <div className={`${board.contractOffers} ${styles.tiles}`} aria-label="Path steps">
                  <div className={board.offerStrip}>
                    {steps.map((st, i) => (
                      <button key={st.id} type="button" data-selected={i === at || undefined} aria-label={`Step ${i + 1}: ${st.title}`}
                        data-testid={`research-step-${st.id}`} data-done={progress[i].have >= progress[i].need} onClick={() => setPicked(i)}>
                        <span className={styles.stepIcon} style={{ color: st.color }}><StepIcon icon={st.icon} /></span>
                        <span>{progress[i].have >= progress[i].need ? '\u2713' : `${progress[i].have}/${progress[i].need}`}</span>
                      </button>
                    ))}
                  </div>
                </div>
                <div className={styles.focus}>
                  <span className={styles.stepBig} style={{ color: step.color }}><StepIcon icon={step.icon} size={60} /></span>
                  <span className={styles.eyebrow}>Step {at + 1} of {steps.length} \u00b7 {progress[at].have}/{progress[at].need}</span>
                  <h2 data-testid="community-research-title">{step.title}</h2>
                  <p>{step.brief}</p>
                  <p className={styles.why} data-testid="community-research-why">{step.why}</p>
                </div>
              </section>
              <section className={styles.right}>
                <h2>Explorer week</h2>
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
                  <b>{finished} of {steps.length} steps</b>
                  <em>{stampedDays} of 7 days stamped</em>
                </div>
                <div className={styles.bar} data-testid="research-community-bar">
                  <div className={styles.barLabel}><span>Community</span><span>{bar.total} / {bar.goal}</span></div>
                  <div className={styles.track} role="progressbar" aria-valuemin={0} aria-valuemax={bar.goal} aria-valuenow={bar.total} aria-label="Community stamps">
                    <div className={styles.fill} style={{ width: `${bar.fill * 100}%` }} />
                  </div>
                </div>
                <button type="button" className={board.contractTake} data-testid="community-research-go" onClick={() => onGo(step.kind)}>
                  {step.kind === 'event' ? 'JOIN' : 'GO'}
                </button>
              </section>
            </>
          )}
        </article>
      </section>
    </div>
  )
}
