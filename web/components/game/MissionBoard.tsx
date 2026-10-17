'use client'

import { StashChip } from '@/components/game/hub/StashChip'
import { useMemo, useState, type CSSProperties } from 'react'
import { useHelp } from '@/components/ui/useHelp'
import type { Catalog } from '@/lib/catalog'
import type { Player } from '@/lib/game-types'
import type { MissionRelayCardModel } from '@/lib/hooks/useMissionRelayModels'
import { clientAffinityLevel } from '@/lib/systems/AcademySystem'
import { FRANC, formatFrancs } from '@/lib/format'
import { isDevLauncherEnabled } from '@/lib/devAccess'
import {
  orionidsDevForced,
  orionidsForcedInstant,
  orionidsTeaserDevForced,
  orionidsTeaserForcedInstant,
  skyEventNow,
} from '@/lib/data/sky-events'
import {
  eventsBoard,
  programChain,
  type ProgramStep,
  type SkyBoardCard,
} from '@/lib/mission-board-view'
import { takeMissionBoardTab, type MissionBoardTab } from '@/lib/mission-board-nav'
import ClientMark from '@/components/ui/ClientMark'
import { HubClockWidget } from '@/components/game/hub/HubClockWidget'
import { BaseWorldCanvas } from '@/components/game/hub/BaseWorldCanvas'
import { homeCenter, kitScale } from '@/lib/scene/base-site'
import { sanitizeEarthBiome } from '@/lib/scene/base-world'
import { useViewSize } from '@/lib/hooks/useViewSize'
import { EarthBaseModules } from '@/components/game/hub/EarthBaseModules'
import { buildHubBuildingDefs } from '@/lib/hub-building-defs'
import { buildPlotEntities } from '@/lib/engine/prefabs'
import { useTimeOfDay } from '@/lib/hooks/useTimeOfDay'
import SettingsSheet from '@/components/game/SettingsSheet'
import FriendsSheet from '@/components/game/FriendsSheet'
import styles from './MissionBoard.module.css'

// The board stands on the live base: the same plots and kit the Hub draws.
const BASE_PLOTS = buildPlotEntities()
const BOARD_BASE_KINDS = new Set(['launchpad', 'hangar', 'market'])

interface MissionBoardProps {
  catalog: Catalog
  player: Player
  cards: MissionRelayCardModel[]
  selectedIndex: number
  onSelectRelative: (offset: number) => void
  onAccept: (id: string, disposition?: 'store' | 'sell') => void
  onClose: () => void
  onOpenLog: () => void
  onOpenBuild: () => void
  /** The rocket now stands on the pad in the scene behind the board. */
  rocketImg?: string
  tutorialBlocked: boolean
  onboardingComplete: boolean
}

function CogIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" /></svg>
}

function ArrowIcon({ direction }: { direction: 'left' | 'right' }) {
  return direction === 'left'
    ? <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 6 9 12l6 6" /></svg>
    : <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 6 6 6-6 6" /></svg>
}

function PeopleIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="3" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
}

function CubeIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3 20 7.5v9L12 21l-8-4.5v-9L12 3z" /><path d="M12 12 20 7.5M12 12v9M12 12 4 7.5" /></svg>
}

function ChartIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 19V5M4 19h16" /><path d="m7 14 4-4 3 3 5-6" /></svg>
}

function ClipboardIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="6" y="4" width="12" height="16" rx="2" /><path d="M9 4.5h6M9 9h6M9 13h6M9 17h4" /></svg>
}

function StarIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 3 2.2 6.4H21l-5.4 4 2 6.6L12 16.8 6.4 20l2-6.6L3 9.4h6.8L12 3z" /></svg>
}

function CheckIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12 5 5L20 7" /></svg>
}

function LockIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></svg>
}

function DownIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg>
}

const STEP_KIND_LABEL: Record<ProgramStep['kind'], string> = { instrument: 'Instrument', academy: 'Crew', build: 'Build', mining: 'Mining', focus: 'Focus' }
const STEP_STATE_LABEL: Record<ProgramStep['state'], string> = { done: 'Done', current: 'Next up', available: 'Open', locked: 'Locked' }

function StepGlyph({ kind }: { kind: ProgramStep['kind'] }) {
  if (kind === 'academy') return <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="3" /><path d="M5 19c1.5-3 4-4.5 7-4.5S17.5 16 19 19" /><path d="M4 11h16" /></svg>
  if (kind === 'build') return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20h16M6 20V9l6-5 6 5v11" /><path d="M10 20v-5h4v5" /></svg>
  if (kind === 'mining' || kind === 'focus') return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 18h16M8 18l2-8h4l2 8M10 10V7h4v3" /></svg>
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 16c3-1 5-5 8-12 3 7 5 11 8 12" /><circle cx="12" cy="16" r="2" /><path d="M8 20h8" /></svg>
}

function MineralRock({ shape, color }: { shape?: string; color: string }) {
  const ink = 'var(--ln-board-ink)'
  return <span className={styles.rock} aria-hidden="true">
    <svg viewBox="0 0 24 24">
      {shape === 'diamond' && <path d="M12 2.5 20 9.5 12 21.5 4 9.5Z" fill={color} stroke={ink} strokeWidth="1.6" strokeLinejoin="round" />}
      {shape === 'triangle' && <path d="M12 3 21.5 20.5H2.5Z" fill={color} stroke={ink} strokeWidth="1.6" strokeLinejoin="round" />}
      {shape === 'rect' && <path d="M4 9h16v11H4zM7.5 9 9 4.5h6L17 9" fill={color} stroke={ink} strokeWidth="1.6" strokeLinejoin="round" />}
      {(!shape || shape === 'circle') && <path d="M8 7.5c2.2-3 7.2-2.4 8.4.4 2.6.4 3.4 4.2 1.2 6.2-.6 2.8-4.2 4.6-7.6 3.2C6.2 16.2 4.6 12.2 6.2 9.4 6.4 8.6 7 7.8 8 7.5Z" fill={color} stroke={ink} strokeWidth="1.6" strokeLinejoin="round" />}
    </svg>
  </span>
}

const EVENT_BANNERS = {
  orionids: '/game/assets/events/banners/orionids.png',
  comet: '/game/assets/events/banners/draconids.png',
  saturn: '/game/assets/events/banners/saturn.png',
  rocket: '/game/assets/events/banners/rocket.png',
  moon: '/game/assets/events/banners/moon.png',
} as const

function SkyBanner({ kind }: { kind: keyof typeof EVENT_BANNERS }) {
  return <img className={styles.banner} src={EVENT_BANNERS[kind]} alt="" />
}

function bannerKind(id: string): 'comet' | 'saturn' | 'rocket' | 'moon' {
  if (id.startsWith('saturn')) return 'saturn'
  if (id.startsWith('rocket')) return 'rocket'
  if (id.startsWith('new-moon')) return 'moon'
  return 'comet'
}

function Medal({ tier }: { tier: 'gold' | 'silver' | 'empty' }) {
  return <span className={styles.medal} data-tier={tier === 'empty' ? undefined : tier} aria-hidden="true">
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="9" r="5" /><path d="m9 13-2 8 5-3 5 3-2-8" /></svg>
  </span>
}

function EventStatus({ card }: { card: SkyBoardCard }) {
  if (card.status === 'upcoming' && card.countdownLabel) return <span className={styles.countdown}>{card.countdownLabel}</span>
  const label = card.status === 'live' ? 'LIVE' : 'ENDED'
  return <span className={styles.ended}>{label}</span>
}

function boardClock(): { now: number; orionidsNow: number } {
  const dev = isDevLauncherEnabled()
  const now = skyEventNow(dev)
  if (!dev) return { now, orionidsNow: now }
  if (orionidsDevForced()) return { now, orionidsNow: orionidsForcedInstant() }
  if (orionidsTeaserDevForced()) return { now, orionidsNow: orionidsTeaserForcedInstant() }
  return { now, orionidsNow: now }
}

function PickIcon() {
  return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M14 4 20 10M4 20l9-9M9 5c3-2 7-1 10 2M5 9c-2 3-1 7 2 10" /></svg>
}

export default function MissionBoard({
  catalog, player, cards, selectedIndex, onSelectRelative, onAccept, onClose, onOpenLog, onOpenBuild,
  tutorialBlocked, onboardingComplete,
}: MissionBoardProps) {
  const { grade } = useTimeOfDay()
  const [tab, setTab] = useState<MissionBoardTab>(() => takeMissionBoardTab() ?? 'contracts')
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [friendsOpen, setFriendsOpen] = useState(false)
  const help = useHelp('missions')
  const { now, orionidsNow } = boardClock()
  const steps = useMemo(() => programChain(catalog, player, now), [catalog, player, now])
  const events = useMemo(() => eventsBoard(now, player.badges, orionidsNow), [now, orionidsNow, player.badges])
  const freeRuns = useMemo(() => catalog.missions.filter(m => m.id.startsWith('self-directed-') && !m.locked), [catalog.missions])
  const count = cards.length
  const index = count === 0 ? 0 : Math.min(selectedIndex, count - 1)
  const card = cards[index]
  const client = card?.client
  const clientLevel = client ? clientAffinityLevel(player.clientMissions[client.id] ?? 0) : 0
  const paging = tab === 'contracts' && count > 1

  const startStep = (step: ProgramStep) => {
    if (step.state === 'locked' || step.state === 'done') return
    onAccept(step.id, step.kind === 'focus' ? 'store' : undefined)
  }

  const baseBuildings = useMemo(
    () => buildHubBuildingDefs(player, BASE_PLOTS).filter(building => BOARD_BASE_KINDS.has(building.kind)),
    [player],
  )
  // The board's backdrop is the base itself: same world, same structures, framed on what is built.
  const view = useViewSize()
  const boardPx = kitScale(view)
  const boardCamX = view.w / 2 - homeCenter(baseBuildings.map(b => b.kind), view.w / boardPx) * boardPx
  const signalColor = client?.color ?? 'var(--ln-board-amber)'
  const tabButtons = <>
    <button type="button" className={styles.tab} data-tab="contracts" data-active={tab === 'contracts'} data-testid="mission-board-tab-contracts" onClick={() => setTab('contracts')}><ChartIcon /><span className={styles.tabLabel}>Contracts</span></button>
    {player.freeOperations && <button type="button" className={styles.tab} data-tab="free" data-active={tab === 'free'} data-testid="mission-board-tab-free" onClick={() => setTab('free')}><PickIcon /><span className={styles.tabLabel}>Free run</span></button>}
    <button type="button" className={styles.tab} data-tab="program" data-active={tab === 'program'} data-testid="mission-board-tab-program" onClick={() => setTab('program')}><ClipboardIcon /><span className={styles.tabLabel}>Program</span></button>
    <button type="button" className={styles.tab} data-tab="events" data-active={tab === 'events'} data-testid="mission-board-tab-events" onClick={() => setTab('events')}>
      <StarIcon /><span className={styles.tabLabel}>Events</span>
      {events.attention && <i className={styles.dot} data-testid="mission-board-events-dot" aria-label="Event live or upcoming" />}
    </button>
    <button type="button" className={styles.log} data-testid="mission-board-log" onClick={onOpenLog}>LOG</button>
  </>

  return <div className={styles.scene} data-testid="mission-setup-scaffold" data-screen="missions" data-paging={paging ? 'true' : 'false'} data-tab={tab}>
    <div className={styles.sky} aria-hidden="true" style={{ '--px': `${boardPx}px`, '--hub-ground': '20%' } as CSSProperties}>
      <BaseWorldCanvas px={boardPx} camera={{ x: boardCamX, y: 0, zoom: 1 }} time={grade} biome={sanitizeEarthBiome(player.earthBiome)} />
      <div style={{ position: 'absolute', inset: 0, transform: `translateX(${boardCamX}px)` }}>
        <EarthBaseModules buildings={baseBuildings} parts={player.shipCustomizerParts} padRocket={Object.values(player.shipCustomizerParts ?? {}).some(Boolean)} />
      </div>
      {tab !== 'contracts' && <div className={styles.dim} />}
    </div>
    <div className={styles.chrome}>
      <button type="button" className={`${styles.round} ${styles.cog}`} data-testid="settings-button" aria-label="Settings" onClick={() => setSettingsOpen(true)}><CogIcon /></button>
      <div className={styles.clock}><HubClockWidget /></div>
      <div className={styles.chips}>
        <span className={styles.chip} data-testid="hub-francs-chip">{formatFrancs(player.francs, { compact: true })}</span>
        <StashChip testId="hub-cargo-chip" className={`${styles.chip} ${styles.cargoChip}`}><CubeIcon /></StashChip>
        <button type="button" className={styles.round} data-testid="friends-button" aria-label="Friends" onClick={() => setFriendsOpen(true)}><PeopleIcon /></button>
      </div>
    </div>
    {tab === 'contracts' ? <section className={styles.dispatch} data-testid="mission-board" aria-label="Mission board">
      <nav className={styles.rail} aria-label="Mission board">
        <button type="button" className={`${styles.round} ${styles.railClose}`} data-testid="mission-board-close" aria-label="Close" onClick={onClose}><ArrowIcon direction="left" /></button>
        {tabButtons}
        {help.button && <div className={styles.railHelp}>{help.button}</div>}
      </nav>
      {card ? <>
        <article key={card.mission.id} className={styles.order} style={{ '--signal': signalColor } as CSSProperties} aria-live="polite" data-testid="mission-board-section-client">
          <div className={styles.signal} aria-hidden="true">
            <i className={styles.beam} /><i className={styles.pulse} /><i className={styles.ring} /><i className={styles.ring} />
          </div>
          <header className={styles.orderHead}>
            <ClientMark initial={client?.initial ?? 'OP'} color={client?.color ?? 'var(--ln-board-amber)'} uiRole={client?.uiRole ?? 'starter'} clientId={client?.id} size={44} />
            <div className={styles.orderWho}>
              <span>{client?.name ?? 'Your program'}{client ? ` · L${clientLevel}` : ''}</span>
              <h2 className={styles.orderTitle}>{card.mission.title}</h2>
            </div>
          </header>
          <div className={styles.orderDeal}>
            <div className={styles.manifest} aria-label="Cargo">
              {Object.entries(card.mission.requires.minerals).map(([id, amount]) => {
                const meta = catalog.minerals[id]
                if (!meta) return null
                return <span key={id} className={styles.crate} title={meta.name}><MineralRock shape={meta.shape} color={meta.color} /><b>{amount}</b><em>{meta.name}</em></span>
              })}
            </div>
            <strong className={styles.pay}><i className={styles.coin} aria-hidden="true">{FRANC}</i>{formatFrancs(card.displayPayout, { compact: true })}</strong>
            <button type="button" className={styles.take} data-testid={`mission-accept-${card.mission.id}`} disabled={!card.unlocked || tutorialBlocked} onClick={() => onAccept(card.mission.id)}>ACCEPT</button>
          </div>
          {!card.unlocked && card.lockedDetail && <p className={styles.orderLock}>{card.lockedDetail}</p>}
          {paging && <footer className={styles.orderNav}>
            <button type="button" className={styles.round} data-testid="mission-board-prev" aria-label="Previous contract" onClick={() => onSelectRelative(-1)}><ArrowIcon direction="left" /></button>
            {count <= 8 && <div className={styles.orderDots}>
              {cards.map((item, dot) => <button key={item.mission.id} type="button" className={styles.dotBtn} data-active={dot === index} aria-label={`Contract ${dot + 1}`} onClick={() => onSelectRelative(dot - index)}><i /></button>)}
            </div>}
            <span className={styles.orderCount}>{index + 1}/{count}</span>
            <button type="button" className={styles.round} data-testid="mission-board-next" aria-label="Next contract" onClick={() => onSelectRelative(1)}><ArrowIcon direction="right" /></button>
          </footer>}
        </article>
      </> : <article className={styles.order} data-testid="mission-board-section-client">
        {onboardingComplete ? <>
          <h2 className={styles.orderTitle}>No client signals yet</h2>
          <p className={styles.orderLock}>Free Ops opens once the Earth storage silo is built.</p>
          <button type="button" className={styles.take} onClick={onOpenBuild}>BUILD STORAGE SILO</button>
        </> : <h2 className={styles.orderTitle}>No compatible client signals</h2>}
      </article>}
    </section> : <section className={styles.panel} data-testid="mission-board" aria-label="Mission board">
      <button type="button" className={`${styles.round} ${styles.close}`} data-testid="mission-board-close" aria-label="Close" onClick={onClose}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" /></svg></button>
      {help.button && <div className={styles.help}>{help.button}</div>}
      <nav className={styles.tabs} aria-label="Mission board">{tabButtons}</nav>
      <div className={styles.stage}>
        <div className={styles.body}>
          {tab === 'free' && <div className={styles.chain} data-testid="mission-board-free">
            <header className={styles.chainHead}>
              <div>
                <h2>Your own mining run</h2>
                <p>No client, no daily limit. Pick what to mine, keep it or sell it at market price.</p>
              </div>
            </header>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))', gap: 8, marginTop: 8 }}>
              {freeRuns.map(run => <article key={run.id} data-testid={`free-run-${run.id}`} style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: 12, background: '#faf7f0', color: '#1a2a3c', border: '2px solid #1a2a3c', borderRadius: 6 }}>
                <h3 style={{ margin: 0, font: '800 14px var(--ln-font-display)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>{run.title}</h3>
                <p style={{ margin: 0, font: '14px var(--ln-font-body)' }}>{Object.entries(run.requires.minerals).map(([id, amount]) => `${amount} ${catalog.minerals[id]?.name ?? id}`).join(', ')}</p>
                <button type="button" className={styles.take} onClick={() => onAccept(run.id)}>START RUN</button>
              </article>)}
              {freeRuns.length === 0 && <p className={styles.orderLock}>No free runs are available yet.</p>}
            </div>
          </div>}
          {tab === 'program' && <div className={styles.chain} data-testid="mission-board-program">
            <header className={styles.chainHead} data-testid="program-summary">
              <div>
                <h2>Your space program</h2>
                <p>{steps.filter(step => step.state === 'done').length} of {steps.length} steps complete</p>
              </div>
              <div className={styles.meter} role="progressbar" aria-valuemin={0} aria-valuemax={steps.length} aria-valuenow={steps.filter(step => step.state === 'done').length} aria-label="Program progress">
                <i style={{ width: `${(steps.filter(step => step.state === 'done').length / Math.max(steps.length, 1)) * 100}%` }} />
              </div>
            </header>
            <ol className={styles.roadmap}>
              {steps.map((step, stepIndex) => <li key={step.id} className={styles.roadStep} data-state={step.state}>
                <span className={styles.node} aria-hidden="true">{step.state === 'done' ? <CheckIcon /> : stepIndex + 1}</span>
                <article className={styles.step} data-state={step.state} data-testid={`program-step-${step.id}`}>
                  <span className={styles.glyph} aria-hidden="true"><StepGlyph kind={step.kind} /></span>
                  <div className={styles.stepBody}>
                    <span className={styles.kicker}>{STEP_KIND_LABEL[step.kind]} · {STEP_STATE_LABEL[step.state]}</span>
                    <h3>{step.title}</h3>
                    <p className={styles.reward}><b>Unlocks</b> {step.detail}</p>
                    {step.state === 'locked' && step.lockLine && (
                      <div className={styles.gate}>
                        <span><LockIcon /> Needs: {step.lockLine}</span>
                        {step.progress && (
                          <span className={styles.gateMeter}>
                            <i style={{ width: `${(step.progress.have / step.progress.need) * 100}%` }} />
                            <em>{step.progress.label} {step.progress.have}/{step.progress.need}</em>
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  <div className={styles.mark}>
                    {step.state === 'done' && <span className={styles.doneMark} aria-label="Done"><CheckIcon /></span>}
                    {step.state === 'locked' && <span aria-label="Locked"><LockIcon /></span>}
                    {(step.state === 'current' || step.state === 'available') && <button type="button" className={styles.start} data-testid={`program-start-${step.id}`} onClick={() => startStep(step)}>{step.state === 'current' ? 'START' : 'ACCEPT'}</button>}
                  </div>
                </article>
              </li>)}
            </ol>
          </div>}

          {tab === 'events' && <div className={styles.events} data-testid="mission-board-events">
            <article className={styles.hero} data-testid="events-orionids">
              <div className={styles.heroArt} aria-hidden="true"><SkyBanner kind="orionids" /></div>
              <div className={styles.heroBody}>
                <h2>{events.orionids.name}</h2>
                <EventStatus card={events.orionids} />
                <div className={styles.badges} aria-label="Orionids badge slots">
                  <Medal tier={events.orionids.earnedTier === 'gold' ? 'gold' : 'empty'} />
                  <Medal tier={events.orionids.earnedTier === 'silver' ? 'silver' : 'empty'} />
                </div>
                <p className={styles.blurb}>{events.orionids.blurb}</p>
              </div>
            </article>
            <div className={styles.stack}>
              {events.wsw.map(event => <article key={event.id} className={styles.eventCard} data-testid={`events-card-${event.id}`}>
                <div className={styles.eventArt} aria-hidden="true"><SkyBanner kind={bannerKind(event.id)} /></div>
                <div className={styles.eventBody}>
                  <h3>{event.name}</h3>
                  <div className={styles.badges}>
                    <Medal tier={event.earnedTier ?? 'silver'} />
                  </div>
                  <EventStatus card={event} />
                </div>
              </article>)}
            </div>
          </div>}
        </div>
      </div>
    </section>}
    {help.layer}
    {settingsOpen && <SettingsSheet onClose={() => setSettingsOpen(false)} />}
    {friendsOpen && <FriendsSheet onClose={() => setFriendsOpen(false)} />}
  </div>
}
