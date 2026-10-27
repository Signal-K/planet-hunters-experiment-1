'use client'

import { useEffect, useState } from 'react'
import { GalaxyMap } from '@/components/game/MissionBoard'
import { liveEventWeek } from '@/lib/research/event-week'
import { communityBar, historicalContributionMonths, researchMonthHistory, stampDayKey, stampsInMonth, type CommunityResearch, type StampKind } from '@/lib/research/stamps'
import { explorerSteps, pathThisWeek, stepProgress, traderSteps, WEEKLY_RESEARCH_REWARDS, weekKey, type PathStep, type ResearchPathId } from '@/lib/research/paths'
import type { Player } from '@/lib/game-types'
import board from '@/components/game/MissionBoard.module.css'
import styles from './CommunityResearchScreen.module.css'

interface CommunityResearchScreenProps {
  player: Player
  communityResearch?: CommunityResearch | null
  onBack: () => void
  onChoosePath: (path: ResearchPathId) => void
  onClaimReward: (step: PathStep, progress: { have: number; need: number }) => void
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

function StepIcon({ icon, size = 28 }: { icon: PathStep['icon']; size?: number }) {
  const art = {
    signal: <><path d="M2.5 12h3.8l2-5.5 4.1 11 2.1-5.5h6.9" /><circle cx="18.5" cy="6" r="1.5" fill="currentColor" stroke="none" /></>,
    scan: <><path d="M4 8V4h4M16 4h4v4M20 16v4h-4M8 20H4v-4" /><rect x="8" y="8" width="8" height="8" rx="2" fill="currentColor" fillOpacity=".18" /><path d="M10 12h4M12 10v4" /></>,
    world: <><circle cx="12" cy="12" r="9" fill="currentColor" fillOpacity=".14" /><path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18" /><path d="m5.5 7 2 1.2L6.2 10M18.5 15l-2-1.2 1.3-1.8" /></>,
    sky: <><path d="M4 20 16 8" /><path d="m10 4 1 3 3 1-3 1-1 3-1-3-3-1 3-1Z" fill="currentColor" fillOpacity=".22" /><path d="m17 13 .7 2 2 .7-2 .7-.7 2-.7-2-2-.7 2-.7Z" fill="currentColor" fillOpacity=".22" /></>,
    star: <><path d="m12 3 2.6 5.6 6 .7-4.5 4.1 1.2 6L12 16.4 6.7 19.4l1.2-6L3.4 9.3l6-.7Z" fill="currentColor" fillOpacity=".18" /><circle cx="12" cy="12" r="1.6" fill="currentColor" stroke="none" /></>,
  }[icon]
  return <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{art}</svg>
}

const HOW_IT_WORKS = [
  'Pick a path. It is locked for the week and resets on Monday.',
  'Finish its five steps in any order. Missing a day costs nothing.',
  'Every step is a stamp that also fills the shared community bar.',
]

function contributionTimes(player: Player): number[] {
  return [
    ...Object.values(player.tessClassifications ?? {}).map(record => record.submittedAt),
    ...Object.values(player.asteroidClassifications ?? {}).map(record => record.submittedAt),
    ...Object.values(player.saturnClassifications ?? {}).map(record => record.submittedAt),
  ].filter((submittedAt): submittedAt is number => typeof submittedAt === 'number')
}

/** Community research as a mission board: research tasks on the left, the chosen one in the middle, your week and the way in on the right. */
export default function CommunityResearchScreen({ player, communityResearch, onBack, onChoosePath, onClaimReward, onGo }: CommunityResearchScreenProps) {
  const now = Date.now()
  const event = liveEventWeek(now)
  const path = pathThisWeek(player.researchPath, now)
  const week = weekKey(now)
  const [selectedPath, setSelectedPath] = useState<ResearchPathId>('explorer')
  const steps = (path ?? selectedPath) === 'trader'
    ? traderSteps({ eventName: event?.name ?? null })
    : explorerSteps({ hasDiscovery: Object.keys(player.discoveredExoplanetTargets ?? {}).length > 0, eventName: event?.name ?? null })
  const stamps = player.researchStamps ?? {}
  const progress = steps.map(st => stepProgress(st, stamps, week, now))
  const firstOpen = Math.max(0, progress.findIndex(p => p.have < p.need))
  const [picked, setPicked] = useState<number | null>(null)
  const [readout, setReadout] = useState<'mission' | 'rewards'>('mission')
  const at = Math.min(picked ?? firstOpen, steps.length - 1)
  const step = steps[at]
  const days = weekDays(now)
  const stampedDays = days.filter(d => (stamps[d.key] ?? []).length > 0).length
  const d = new Date(now)
  const ownThisMonth = stampsInMonth(stamps, d.getUTCFullYear(), d.getUTCMonth())
  const bar = communityBar(ownThisMonth, communityResearch)
  const monthHistory = researchMonthHistory(stamps, now, 6, historicalContributionMonths(stamps, contributionTimes(player), now))
  const finished = progress.filter(p => p.have >= p.need).length
  const eventHistory = Object.entries(stamps)
    .filter(([, kinds]) => kinds.includes('event'))
    .sort(([a], [b]) => b.localeCompare(a))
  const color = path ? step.color : '#58d0ea'
  const rewardSignature = `${path ?? 'picker'}:${player.researchPath?.claimedSteps?.join('.') ?? ''}:${steps.map((researchStep, index) => `${researchStep.id}:${progress[index].have >= progress[index].need ? 'done' : 'open'}`).join('|')}`
  useEffect(() => {
    if (!path) return
    steps.forEach((researchStep, index) => onClaimReward(researchStep, progress[index]))
    // The signature changes after each claim and stops changing once the
    // weekly rewards are recorded, so the idempotent updater does not loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path, rewardSignature])
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
                  <button type="button" className={styles.path} data-selected={selectedPath === 'explorer'} data-testid="research-path-explorer" aria-label="Explorer path" onClick={() => setSelectedPath('explorer')}><StepIcon icon="scan" size={34} /><span>Explorer</span><small>Signals</small></button>
                  <button type="button" className={styles.path} data-selected={selectedPath === 'trader'} data-testid="research-path-trader" aria-label="Trader path" onClick={() => setSelectedPath('trader')}><StepIcon icon="world" size={34} /><span>Trader</span><small>Exchange</small></button>
                  <button type="button" className={styles.path} disabled data-testid="research-path-agency" aria-label="Agency path, locked"><StepIcon icon="star" size={34} /><span>Agency</span><small>Locked</small></button>
                </div>
                <div className={styles.focus}>
                  <span className={styles.eyebrow}>This week&apos;s path</span>
                  <h2 data-testid="community-research-title">{selectedPath === 'trader' ? 'Trader' : 'Explorer'}</h2>
                  <p>{selectedPath === 'trader' ? 'Trade, run contracts and watch prices. Five steps, and the research helps everyone.' : 'Classify signals, scan worlds and chase the sky. Five steps, and the research helps everyone.'}</p>
                </div>
              </section>
              <section className={styles.right}>
                <h2>How it works</h2>
                <ol className={styles.how} data-testid="community-research-how">
                  {HOW_IT_WORKS.map(line => <li key={line}>{line}</li>)}
                </ol>
                <button type="button" className={board.contractTake} data-testid="community-research-choose" onClick={() => onChoosePath(selectedPath)}>START {selectedPath.toUpperCase()}</button>
                {eventHistory.length > 0 && (
                  <section className={styles.facts} data-testid="community-research-history" aria-label="Research history">
                    <b>Research history</b>
                    <em>Orionids shower contribution recorded on {eventHistory[0][0]}</em>
                  </section>
                )}
              </section>
            </>
          ) : (
            <>
              <section className={styles.left}>
                <div className={styles.pathHeader}>
                  <span className={styles.eyebrow}>{path === 'trader' ? 'Trader' : 'Explorer'} pathway</span>
                  <span>{finished}/{steps.length} complete</span>
                </div>
                <div className={styles.pathway} aria-label="Weekly research pathway" data-testid="community-research-pathway">
                  {steps.map((st, i) => (
                    <button key={st.id} type="button" className={styles.pathStep} data-selected={i === at || undefined} aria-label={`Step ${i + 1}: ${st.title}`}
                      data-testid={`research-step-${st.id}`} data-done={progress[i].have >= progress[i].need} onClick={() => { setPicked(i); setReadout('mission') }}>
                      <span className={styles.pathMarker} style={{ '--step-color': st.color } as React.CSSProperties}><StepIcon icon={st.icon} /></span>
                      <span className={styles.pathCopy}><b>Step {i + 1}</b><strong>{st.title}</strong></span>
                      <span className={styles.pathCount}>{progress[i].have >= progress[i].need ? 'Done' : `${progress[i].have}/${progress[i].need}`}</span>
                    </button>
                  ))}
                </div>
              </section>
              <section className={styles.right}>
                <div className={styles.readoutTabs} role="tablist" aria-label="Research readout">
                  <button type="button" role="tab" aria-selected={readout === 'mission'} onClick={() => setReadout('mission')}>Mission</button>
                  <button type="button" role="tab" aria-selected={readout === 'rewards'} onClick={() => setReadout('rewards')}>Rewards</button>
                </div>
                {readout === 'mission' ? <>
                  <span className={styles.stepBig} style={{ color: step.color }}><StepIcon icon={step.icon} size={60} /></span>
                  <span className={styles.eyebrow}>Step {at + 1} of {steps.length} · {progress[at].have}/{progress[at].need}</span>
                  <h2 data-testid="community-research-title">{step.title}</h2>
                  <p className={styles.readoutCopy}>{step.brief}</p>
                  <p className={styles.why} data-testid="community-research-why">{step.why}</p>
                  <div className={styles.week} role="list" aria-label="This week" data-testid="community-research-week">
                    {days.map(day => <div key={day.key} role="listitem" className={styles.day} data-stamped={(stamps[day.key] ?? []).length > 0} data-today={day.today} data-future={day.future}><i aria-hidden="true" /><span>{day.letter}</span></div>)}
                  </div>
                  <button type="button" className={board.contractTake} data-testid="community-research-go" onClick={() => onGo(step.kind)}>{step.kind === 'event' ? 'JOIN' : 'GO'}</button>
                </> : <>
                  <h2>Your rewards</h2>
                  <div className={styles.rewardShelf} data-testid="community-research-rewards" aria-label="Weekly reward milestones">
                    <div className={styles.rewardCard} data-earned={progress[1]?.have >= progress[1]?.need}><span className={styles.rewardIcon}><StepIcon icon="signal" size={30} /></span><b>2</b><small>{WEEKLY_RESEARCH_REWARDS['step-2'].fragments}</small><em>fragments</em></div>
                    <div className={styles.rewardCard} data-earned={progress[3]?.have >= progress[3]?.need}><span className={styles.rewardIcon}><StepIcon icon="scan" size={30} /></span><b>4</b><small>{WEEKLY_RESEARCH_REWARDS['step-4'].fragments}</small><em>fragments</em></div>
                    <div className={styles.rewardCard} data-earned={progress[4]?.have >= progress[4]?.need}><span className={styles.rewardIcon}><StepIcon icon="star" size={30} /></span><b>5</b><small>Badge</small><em>breakthrough</em></div>
                  </div>
                  <div className={styles.ledger} data-testid="community-research-ledger"><span className={styles.ledgerOrb}><StepIcon icon="star" size={22} /></span><span>Fragments</span><b>{player.researchFragments ?? 0}</b></div>
                  <div className={styles.bar} data-testid="research-community-bar"><div className={styles.barLabel}><span>Shared total</span><span>{bar.total} / {bar.goal}</span></div><div className={styles.track} role="progressbar" aria-valuemin={0} aria-valuemax={bar.goal} aria-valuenow={bar.total} aria-label="Community stamps"><div className={styles.fill} style={{ width: `${bar.fill * 100}%` }} /></div></div>
                  <div className={styles.history} data-testid="community-research-month-history" aria-label="Research month history"><div className={styles.barLabel}><span>Your contributions</span><span>{ownThisMonth} this month</span></div><div className={styles.historyRows}>{monthHistory.map(month => <div className={styles.historyRow} key={month.key}><span>{month.label}</span><b>{month.stamps} contribution{month.stamps === 1 ? '' : 's'}</b></div>)}</div></div>
                  {eventHistory.length > 0 && <section className={styles.facts} data-testid="community-research-history" aria-label="Research history"><b>Research history</b><em>Orionids shower contribution recorded on {eventHistory[0][0]}</em></section>}
                </>}
              </section>
            </>
          )}
        </article>
      </section>
    </div>
  )
}
