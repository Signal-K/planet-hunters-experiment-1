'use client'

import { useEffect, useState } from 'react'
import { GalaxyMap } from '@/components/game/MissionBoard'
import { countdown, eventPanel, liveEventWeek, type EventPanel } from '@/lib/research/event-week'
import { COMMUNITY_REWARD_TEXT, communityBar, historicalContributionMonths, researchMonthHistory, stampDayKey, stampsInMonth, type CommunityResearch, type StampKind } from '@/lib/research/stamps'
import ActionConfirmBar from '@/components/game/ActionConfirmBar'
import { explorerSteps, pathThisWeek, stepProgress, traderSteps, WEEKLY_RESEARCH_REWARDS, weekKey, type PathStep, type ResearchPathId } from '@/lib/research/paths'
import type { Player } from '@/lib/game-types'
import CommunityBallots from './CommunityBallots'
import { useBallots } from '@/lib/community/useBallots'
import { useConsensus, consensusFixtureState } from '@/lib/community/useConsensus'
import { useSite } from '@/lib/community/useSite'
import { SITE_RULES, type SiteView } from '@/lib/community/site'
import CommunityConsensus, { type PendingConsensusReview } from './CommunityConsensus'
import type { ConsensusQueueItem } from '@/lib/community/consensus'
import { getShower } from '@/lib/data/showers'
import { getSkyEvent } from '@/lib/data/sky-events'
import { ORIONIDS_CHAIN, chainInstrument, chainItems, chainRecordings, chainResearchStep, chainStage, getShowerChain, SHOWER_CHAINS, orionidsResearchStep, radioChecked, showerItems, type TwoStepChain } from '@/lib/orionids/chain'
import board from '@/components/game/MissionBoard.module.css'
import styles from './CommunityResearchScreen.module.css'

interface CommunityResearchScreenProps {
  /** SSL-746: a reviewer back from the instrument with their own readout, or null. */
  pendingReview?: PendingConsensusReview | null
  /** Opens the instrument on a queued subject so the reviewer does their own work first. */
  onStartReview?: (item: ConsensusQueueItem) => void
  onFinishReview?: () => void
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

/** SSL-714: the Orionids chain in the research history: the three story items and what ORI-1 has heard. */
function OrionidsRecord({ player, recordedOn }: { player: Player; recordedOn: string | null }) {
  const stage = player.orionidsEventStage ?? 0
  const held = showerItems(ORIONIDS_CHAIN, stage).length
  const recordings = radioChecked(player)
  if (!stage && recordings === 0) return null
  return (
    <section className={styles.record} data-testid="community-research-history" aria-label="Orionids record">
      <b>{stage >= 1 ? 'Orionids record complete' : 'Orionids · no fragments yet'}</b>
      <ol>{ORIONIDS_CHAIN.items.map((item, i) => <li key={item.id} data-held={i < held || undefined}>{item.name}</li>)}</ol>
      {recordings > 0 && <em>{chainInstrument().callsign} · {recordings} recording{recordings === 1 ? '' : 's'} checked</em>}
    </section>
  )
}

/** SSL-831: a chained shower (Leonids) in the research history: its two story items and what its receiver has heard. */
function ChainRecord({ player, chain }: { player: Player; chain: TwoStepChain }) {
  const stage = chainStage(player, chain.eventId)
  if (!stage) return null
  const name = getShower(chain.eventId)?.name ?? 'Shower'
  const held = chainItems(player, chain).length
  const recordings = chainRecordings(player, chain)
  return (
    <section className={styles.record} data-testid="community-research-history" data-event={chain.eventId} aria-label={`${name} record`}>
      <b>{stage >= 2 ? `${name} record complete` : `${name} · mission ${stage + 1} of 2`}</b>
      <ol>{chain.items.map((item, i) => <li key={item.id} data-held={i < held || undefined}>{item.name}</li>)}</ol>
      {stage === 1 && <em>{chainInstrument(chain).callsign} · {Math.min(recordings, chain.radioTarget)} of {chain.radioTarget} recordings checked</em>}
    </section>
  )
}

/**
 * SSL-758: the Community Site: one shared construction bar, the stage reached, each part and what fills it, and
 * the player's own share. A late joiner sees the same bar; nothing is ever deducted from the player.
 */
function CommunitySite({ site, archived }: { site: SiteView; archived: SiteView | null }) {
  return (
    <section className={styles.site} data-testid="community-site" aria-label={site.name}>
      <div className={styles.barLabel}><span>{site.name}</span><span data-testid="community-site-stage">{site.stage} · {Math.round(site.fill * 100)}%</span></div>
      <div className={styles.track} role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(site.fill * 100)} aria-label="Community Site construction"><div className={styles.siteFill} style={{ width: `${site.fill * 100}%` }} /></div>
      <ul className={styles.siteParts}>
        {site.components.map(part => {
          const meta = SITE_RULES.components.find(c => c.id === part.id)
          return <li key={part.id} data-full={part.total >= part.target || undefined}>
            <b>{meta?.label}</b><small>{meta?.feed}</small>
            <span>{Math.min(part.total, part.target)} / {part.target}</span>
          </li>
        })}
      </ul>
      <p className={styles.siteMine} data-testid="community-site-mine">{site.mineTotal > 0 ? `Your share: ${site.mineTotal}. You keep everything you mine and earn.` : 'Finish missions to add your share. You keep everything you mine and earn.'}</p>
      {archived && <p className={styles.siteArchived} data-testid="community-site-archived">Last month: {archived.name} reached {archived.stage} ({Math.round(archived.fill * 100)}%).</p>}
    </section>
  )
}

/** SSL-775: past events stay in the record: every chained shower the player joined, then the Orionids. */
function EventRecords({ player, recordedOn }: { player: Player; recordedOn: string | null }) {
  return <>
    {SHOWER_CHAINS.map(chain => <ChainRecord key={chain.eventId} player={player} chain={chain} />)}
    <OrionidsRecord player={player} recordedOn={recordedOn} />
  </>
}

const shortDate = (ms: number) => new Date(ms).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' })

/**
 * SSL-775: the flagship event, first thing on Community research. Before the window it previews what is coming and
 * when; during it, a countdown to the peak, what to do next, the player's part and the badge tiers; for a week after
 * it, the record and the next shower.
 */
function EventPanelCard({ panel, now, player, step }: { panel: EventPanel; now: number; player: Player; step?: { title: string; brief: string } }) {
  const chain = getShowerChain(`${panel.id}-2026`)
  const missions = chain ? 2 : 1
  const stamps = player.researchStamps ?? {}
  const eventDays = Object.entries(stamps).filter(([day, kinds]) => kinds.includes('event') && day >= stampDayKey(panel.startAt) && day < stampDayKey(panel.endAt)).length
  const done = Math.min(missions, chain ? chainStage(player, chain.eventId) : eventDays)
  const peak = panel.peakAt - now
  // The gold window is the badge rule (sky-events.ts), which can be narrower than the sky calendar's shower.
  const badgeEvent = getSkyEvent(`${panel.id}-2026`)
  const goldFrom = badgeEvent ? Date.parse(badgeEvent.startUtc) : panel.startAt
  const goldTo = badgeEvent ? Date.parse(badgeEvent.endUtc) : panel.endAt
  const earned = player.badges?.[`${panel.id}-2026`]?.tier
  const peakTime = new Date(panel.peakAt).toISOString().slice(11, 16)
  const status = panel.phase === 'live' ? `Live · ends in ${countdown(panel.endAt - now)}`
    : panel.phase === 'upcoming' ? `Starts in ${countdown(panel.startAt - now)} · ${shortDate(panel.startAt)}`
      : `Ended ${shortDate(panel.endAt - 1)}`
  const peakLine = panel.phase === 'ended' ? (panel.next ? `Next: ${panel.next.name} in ${panel.next.startsInDays} day${panel.next.startsInDays === 1 ? '' : 's'}` : null)
    : peak > 0 ? `Peak in ${countdown(peak)} · ${shortDate(panel.peakAt)} ${peakTime} UTC` : 'Past the peak · still falling'
  const what = panel.phase === 'live' ? (step?.title ?? `Fly the ${panel.name} shower run`)
    : panel.phase === 'upcoming' ? `Fly the shower run${chain ? `, then confirm it on ${chainInstrument(chain).callsign}` : ''}. Every player fills the same bar.`
      : done >= missions ? 'Your record is complete.' : 'Replay it from the Events board for silver.'
  return (
    <section className={styles.event} data-phase={panel.phase} data-testid="community-research-event" aria-label={`${panel.name} event`}>
      <div className={styles.eventHead}>
        <span className={styles.eventStatus}><i aria-hidden="true" />{status}</span>
        <h3>{panel.name}</h3>
      </div>
      {peakLine && <p className={styles.eventPeak} data-testid="community-research-event-peak">{peakLine}</p>}
      <p className={styles.eventWhat}>{what}</p>
      <div className={styles.eventBar} role="progressbar" aria-valuemin={0} aria-valuemax={missions} aria-valuenow={done} aria-label="Your part in the event">
        {Array.from({ length: missions }, (_, i) => <i key={i} data-done={i < done || undefined} />)}
        <span>{done} of {missions} mission{missions === 1 ? '' : 's'}</span>
      </div>
      <div className={styles.eventTiers}>
        {earned ? <span data-tier={earned} data-active data-testid="community-research-event-badge">{earned} badge earned</span> : <>
          <span data-tier="gold" data-active={(now >= goldFrom && now < goldTo) || undefined}>Gold · {shortDate(goldFrom)} to {shortDate(goldTo - 1)}</span>
          <span data-tier="silver" data-active={now >= goldTo || undefined}>Silver after</span>
        </>}
      </div>
    </section>
  )
}

const HOW_IT_WORKS = [
  'Pick a path. It is locked for the week and resets on Monday.',
  'Finish its steps in any order. Missing a day costs nothing.',
  'Every step is a stamp that also fills the shared community bar.',
]

function contributionTimes(player: Player): number[] {
  return [
    ...Object.values(player.tessClassifications ?? {}).map(record => record.submittedAt),
    ...Object.values(player.asteroidClassifications ?? {}).map(record => record.submittedAt),
    ...Object.values(player.saturnClassifications ?? {}).map(record => record.submittedAt),
    ...Object.values(player.radioMeteorClassifications ?? {}).map(record => record.submittedAt),
  ].filter((submittedAt): submittedAt is number => typeof submittedAt === 'number')
}

/** Community research as a mission board: research tasks on the left, the chosen one in the middle, your week and the way in on the right. */
export default function CommunityResearchScreen({ player, communityResearch, onBack, onChoosePath, onClaimReward, onGo, pendingReview, onStartReview, onFinishReview }: CommunityResearchScreenProps) {
  const now = Date.now()
  const event = liveEventWeek(now)
  const panel = eventPanel(now)
  const path = pathThisWeek(player.researchPath, now)
  const week = weekKey(now)
  const [selectedPath, setSelectedPath] = useState<ResearchPathId>('explorer')
  // The path is locked for the week, so starting one asks first.
  const [confirmingPath, setConfirmingPath] = useState(false)
  // SSL-714: during the Orionids the event step is the player's next mission in the three-mission chain.
  // SSL-774: any declared shower words its own step; only the Orionids has a saved stage so far.
  const showerId = event ? `${event.id}-2026` : undefined
  // SSL-773: a survey probe in orbit adds a probe-reading step.
  const hasProbe = Object.keys(player.probes ?? {}).length > 0
  // SSL-831: a shower with its own mission chain (Leonids) names the player's next mission in it.
  const chain = getShowerChain(showerId)
  const eventStep = chain ? chainResearchStep(player, chain)
    : showerId && getShower(showerId) ? orionidsResearchStep(event?.id === 'orionids' ? player.orionidsEventStage : 0, showerId) : undefined
  const steps = (path ?? selectedPath) === 'trader'
    ? traderSteps({ eventName: event?.name ?? null, eventStep, hasProbe })
    : explorerSteps({ hasDiscovery: Object.keys(player.discoveredExoplanetTargets ?? {}).length > 0, eventName: event?.name ?? null, eventStep, hasProbe })
  const stamps = player.researchStamps ?? {}
  // SSL-831: a chained shower's step counts its missions (1/2 after the run, done after LEO-1), not the day's stamp.
  const progress = steps.map(st => chain && st.id === 'event' ? { have: chainStage(player, chain.eventId), need: 2 } : stepProgress(st, stamps, week, now))
  const firstOpen = Math.max(0, progress.findIndex(p => p.have < p.need))
  const [picked, setPicked] = useState<number | null>(null)
  const [readout, setReadout] = useState<'mission' | 'rewards' | 'votes'>('mission')
  // SSL-757: community votes. They sit beside the path choice and never block it.
  const ballotState = useBallots(true)
  const consensus = useConsensus(true)
  const { site, archived } = useSite(true)
  const at = Math.min(picked ?? firstOpen, steps.length - 1)
  const step = steps[at]
  const days = weekDays(now)
  const stampedDays = days.filter(d => (stamps[d.key] ?? []).length > 0).length
  const d = new Date(now)
  const ownThisMonth = stampsInMonth(stamps, d.getUTCFullYear(), d.getUTCMonth())
  const bar = communityBar(ownThisMonth, communityResearch)
  const monthHistory = researchMonthHistory(stamps, now, 6, historicalContributionMonths(stamps, contributionTimes(player), now))
  const finished = progress.filter(p => p.have >= p.need).length
  // The reward shelf reads its steps by id: the event and probe steps move the others around.
  const doneById = (...ids: string[]) => steps.some((st, i) => ids.includes(st.id) && progress[i].have >= progress[i].need)
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
                {panel && <EventPanelCard panel={panel} now={now} player={player} step={eventStep} />}
                <div className={styles.paths}>
                  <button type="button" className={styles.path} data-selected={selectedPath === 'explorer'} data-testid="research-path-explorer" aria-label="Explorer path" onClick={() => setSelectedPath('explorer')}><StepIcon icon="scan" size={34} /><span>Explorer</span><small>Signals</small></button>
                  <button type="button" className={styles.path} data-selected={selectedPath === 'trader'} data-testid="research-path-trader" aria-label="Trader path" onClick={() => setSelectedPath('trader')}><StepIcon icon="world" size={34} /><span>Trader</span><small>Exchange</small></button>
                  <button type="button" className={styles.path} disabled data-testid="research-path-agency" aria-label="Agency path, locked"><StepIcon icon="star" size={34} /><span>Agency</span><small>Locked</small></button>
                </div>
                <div className={styles.focus}>
                  <span className={styles.eyebrow}>This week&apos;s path</span>
                  <h2 data-testid="community-research-title">{selectedPath === 'trader' ? 'Trader' : 'Explorer'}</h2>
                  <p>{selectedPath === 'trader' ? 'Trade, run contracts and watch prices. Five steps, and the research helps everyone.' : 'Classify signals, review other players\u2019 findings, scan worlds and chase the sky. The research helps everyone.'}</p>
                </div>
              </section>
              <section className={styles.right}>
                <h2>How it works</h2>
                <ol className={styles.how} data-testid="community-research-how">
                  {HOW_IT_WORKS.map(line => <li key={line}>{line}</li>)}
                </ol>
                <button type="button" className={board.contractTake} data-testid="community-research-choose" onClick={() => setConfirmingPath(true)}>START {selectedPath.toUpperCase()}</button>
                {site && <CommunitySite site={site} archived={archived} />}
                <CommunityBallots state={ballotState} />
                  <CommunityConsensus state={consensus} pendingReview={pendingReview ?? null} onStartReview={item => onStartReview?.(item)} onFinishReview={() => { onFinishReview?.(); consensus.reload() }} />
                <EventRecords player={player} recordedOn={eventHistory[0]?.[0] ?? null} />
              </section>
              {confirmingPath && (
                <ActionConfirmBar
                  eyebrow="This week's path"
                  title={`Start ${selectedPath === 'trader' ? 'Trader' : 'Explorer'}?`}
                  description="Your path is locked until Monday, when it resets and you can pick again."
                  confirmLabel={`Start ${selectedPath === 'trader' ? 'Trader' : 'Explorer'}`}
                  onConfirm={() => { setConfirmingPath(false); onChoosePath(selectedPath) }}
                  onDismiss={() => setConfirmingPath(false)}
                />
              )}
            </>
          ) : (
            <>
              <section className={styles.left}>
                {panel && <EventPanelCard panel={panel} now={now} player={player} step={eventStep} />}
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
                  <button type="button" role="tab" aria-selected={readout === 'rewards'} data-testid="community-research-rewards-tab" onClick={() => setReadout('rewards')}>Rewards</button>
                  <button type="button" role="tab" aria-selected={readout === 'votes'} data-testid="community-research-votes-tab" onClick={() => setReadout('votes')}>Votes</button>
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
                </> : readout === 'votes' ? <>
                  <h2>Community votes</h2>
                  <CommunityBallots state={ballotState} />
                  <CommunityConsensus state={consensus} pendingReview={pendingReview ?? null} onStartReview={item => onStartReview?.(item)} onFinishReview={() => { onFinishReview?.(); consensus.reload() }} />
                </> : <>
                  <h2>Your rewards</h2>
                  <div className={styles.rewardShelf} data-testid="community-research-rewards" aria-label="Weekly reward milestones">
                    <div className={styles.rewardCard} data-earned={doneById('scan', 'contract')}><span className={styles.rewardIcon}><StepIcon icon="signal" size={30} /></span><b>2</b><small>{WEEKLY_RESEARCH_REWARDS['step-2'].fragments}</small><em>fragments</em></div>
                    <div className={styles.rewardCard} data-earned={doneById('scan-again', 'world', 'sales')}><span className={styles.rewardIcon}><StepIcon icon="scan" size={30} /></span><b>4</b><small>{WEEKLY_RESEARCH_REWARDS['step-4'].fragments}</small><em>fragments</em></div>
                    <div className={styles.rewardCard} data-earned={doneById('breakthrough')}><span className={styles.rewardIcon}><StepIcon icon="star" size={30} /></span><b>5</b><small>Badge</small><em>breakthrough</em></div>
                  </div>
                  <div className={styles.ledger} data-testid="community-research-ledger"><span className={styles.ledgerOrb}><StepIcon icon="star" size={22} /></span><span>Fragments</span><b>{player.researchFragments ?? 0}</b></div>
                  <div className={styles.bar} data-testid="research-community-bar"><div className={styles.barLabel}><span>Shared total</span><span>{bar.total} / {bar.goal}</span></div><div className={styles.track} role="progressbar" aria-valuemin={0} aria-valuemax={bar.goal} aria-valuenow={bar.total} aria-label="Community stamps"><div className={styles.fill} style={{ width: `${bar.fill * 100}%` }} /></div></div>
                  {site && <CommunitySite site={site} archived={archived} />}
                  <p className={styles.readoutCopy} data-testid="community-research-goal-reward">{bar.reached ? `Goal reached. Until the month ends: ${COMMUNITY_REWARD_TEXT}.` : `At ${bar.goal} stamps, everyone gets ${COMMUNITY_REWARD_TEXT} until the month ends.`}</p>
                  <div className={styles.history} data-testid="community-research-month-history" aria-label="Research month history"><div className={styles.barLabel}><span>Your contributions</span><span>{ownThisMonth} this month</span></div><div className={styles.historyRows}>{monthHistory.map(month => <div className={styles.historyRow} key={month.key}><span>{month.label}</span><b>{month.stamps} contribution{month.stamps === 1 ? '' : 's'}</b></div>)}</div></div>
                  <EventRecords player={player} recordedOn={eventHistory[0]?.[0] ?? null} />
                </>}
              </section>
            </>
          )}
        </article>
      </section>
    </div>
  )
}
