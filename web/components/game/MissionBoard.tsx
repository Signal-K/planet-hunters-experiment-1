'use client'

import { useMemo, useState } from 'react'
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
  contractWswMark,
  eventsBoard,
  programChain,
  type ProgramStep,
  type SkyBoardCard,
} from '@/lib/mission-board-view'
import { takeMissionBoardTab, type MissionBoardTab } from '@/lib/mission-board-nav'
import ClientMark from '@/components/ui/ClientMark'
import { HubClockWidget } from '@/components/game/hub/HubClockWidget'
import { BaseLayerScene } from '@/components/game/hub/BaseLayerScene'
import { useTimeOfDay } from '@/lib/hooks/useTimeOfDay'
import SettingsSheet from '@/components/game/SettingsSheet'
import FriendsSheet from '@/components/game/FriendsSheet'
import styles from './MissionBoard.module.css'

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
  rocketImg: string
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

function SkyBanner({ kind }: { kind: 'orionids' | 'comet' | 'saturn' | 'rocket' | 'moon' }) {
  return <svg className={styles.banner} viewBox="0 0 320 140" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
    <rect width="320" height="140" fill="var(--ln-world-dusk-top)" />
    <rect y="70" width="320" height="70" fill="var(--ln-world-dusk-horizon)" />
    <rect y="108" width="320" height="32" fill="var(--ln-world-soil)" />
    <rect y="108" width="320" height="6" fill="var(--ln-world-grass)" />
    {[[18, 22], [48, 40], [80, 16], [120, 34], [160, 18], [200, 42], [240, 20], [280, 36], [300, 14]].map(([x, y]) =>
      <rect key={`${x}-${y}`} x={x} y={y} width="3" height="3" fill="var(--ln-board-paper)" />)}
    {kind === 'orionids' && <>
      <polygon points="40,78 150,36 138,48 210,18" fill="var(--ln-board-amber)" />
      <circle cx="214" cy="18" r="12" fill="var(--ln-board-ink)" />
      <rect x="250" y="78" width="10" height="30" fill="var(--ln-board-ink)" />
      <polygon points="242,80 268,80 255,64" fill="var(--ln-board-ink)" />
    </>}
    {kind === 'comet' && <>
      <polygon points="30,90 190,40 170,52" fill="var(--ln-board-paper)" opacity="0.85" />
      <circle cx="196" cy="38" r="8" fill="var(--ln-board-paper)" />
    </>}
    {kind === 'saturn' && <>
      <ellipse cx="168" cy="58" rx="46" ry="14" fill="none" stroke="var(--ln-board-amber)" strokeWidth="4" />
      <circle cx="168" cy="58" r="22" fill="var(--ln-board-lavender-deep)" />
    </>}
    {kind === 'rocket' && <>
      <polygon points="150,96 170,96 160,28" fill="var(--ln-board-paper)" />
      <polygon points="150,96 138,110 160,96" fill="var(--ln-board-coral)" />
      <polygon points="170,96 182,110 160,96" fill="var(--ln-board-coral)" />
    </>}
    {kind === 'moon' && <circle cx="200" cy="52" r="22" fill="var(--ln-board-paper)" />}
  </svg>
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

export default function MissionBoard({
  catalog, player, cards, selectedIndex, onSelectRelative, onAccept, onClose, onOpenLog, onOpenBuild,
  rocketImg, tutorialBlocked, onboardingComplete,
}: MissionBoardProps) {
  const { grade } = useTimeOfDay()
  const [tab, setTab] = useState<MissionBoardTab>(() => takeMissionBoardTab() ?? 'contracts')
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [friendsOpen, setFriendsOpen] = useState(false)
  const { now, orionidsNow } = boardClock()
  const steps = useMemo(() => programChain(catalog, player, now), [catalog, player, now])
  const events = useMemo(() => eventsBoard(now, player.badges, orionidsNow), [now, orionidsNow, player.badges])
  const count = cards.length
  const index = count === 0 ? 0 : Math.min(selectedIndex, count - 1)
  const card = cards[index]
  const client = card?.client
  const clientLevel = client ? clientAffinityLevel(player.clientMissions[client.id] ?? 0) : 0
  const wsw = card ? contractWswMark(card.mission, player.badges, now) : null
  const prevCard = count > 2 ? cards[(index - 1 + count) % count] : null
  const nextCard = count > 1 ? cards[(index + 1) % count] : null
  const paging = tab === 'contracts' && count > 1

  const startStep = (step: ProgramStep) => {
    if (step.state === 'locked' || step.state === 'done') return
    onAccept(step.id, step.kind === 'focus' ? 'store' : undefined)
  }

  return <div className={styles.scene} data-testid="mission-setup-scaffold" data-screen="missions">
    <div className={styles.sky} aria-hidden="true">
      <BaseLayerScene time={grade} />
      <div className={styles.dim} />
    </div>
    <div className={styles.chrome}>
      <button type="button" className={`${styles.round} ${styles.cog}`} data-testid="settings-button" aria-label="Settings" onClick={() => setSettingsOpen(true)}><CogIcon /></button>
      <div className={styles.clock}><HubClockWidget /></div>
      <div className={styles.chips}>
        <span className={styles.chip} data-testid="hub-francs-chip">{formatFrancs(player.francs, { compact: true })}</span>
        <span className={`${styles.chip} ${styles.cargoChip}`} data-testid="hub-cargo-chip" aria-label="Cargo"><CubeIcon /></span>
        <button type="button" className={styles.round} data-testid="friends-button" aria-label="Friends" onClick={() => setFriendsOpen(true)}><PeopleIcon /></button>
      </div>
      <button type="button" className={`${styles.round} ${styles.arrow} ${styles.prev}`} data-testid="mission-board-prev" aria-label="Previous contract" disabled={!paging} onClick={() => paging && onSelectRelative(-1)}><ArrowIcon direction="left" /></button>
      <button type="button" className={`${styles.round} ${styles.arrow} ${styles.next}`} data-testid="mission-board-next" aria-label="Next contract" disabled={!paging} onClick={() => paging && onSelectRelative(1)}><ArrowIcon direction="right" /></button>
    </div>
    <section className={styles.panel} data-testid="mission-board" aria-label="Mission board">
      <nav className={styles.tabs} aria-label="Mission board">
        <button type="button" className={styles.tab} data-tab="contracts" data-active={tab === 'contracts'} data-testid="mission-board-tab-contracts" onClick={() => setTab('contracts')}><ChartIcon />Contracts</button>
        <button type="button" className={styles.tab} data-tab="program" data-active={tab === 'program'} data-testid="mission-board-tab-program" onClick={() => setTab('program')}><ClipboardIcon />Program</button>
        <button type="button" className={styles.tab} data-tab="events" data-active={tab === 'events'} data-testid="mission-board-tab-events" onClick={() => setTab('events')}>
          <StarIcon />Events
          {events.attention && <i className={styles.dot} data-testid="mission-board-events-dot" aria-label="Event live or upcoming" />}
        </button>
        <button type="button" className={styles.log} data-testid="mission-board-log" onClick={onOpenLog}>LOG</button>
      </nav>
      <div className={styles.stage}>
        <button type="button" className={`${styles.round} ${styles.close}`} data-testid="mission-board-close" aria-label="Close" onClick={onClose}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" /></svg></button>
        <div className={styles.body}>
          {tab === 'contracts' && (card ? <div className={styles.carousel}>
            {prevCard && <button type="button" className={`${styles.peek} ${styles.peekPrev}`} aria-label={`Show ${prevCard.mission.title}`} onClick={() => onSelectRelative(-1)} />}
            {nextCard && <button type="button" className={`${styles.peek} ${styles.peekNext}`} aria-label={`Show ${nextCard.mission.title}`} onClick={() => onSelectRelative(1)} />}
            <article className={styles.card} aria-live="polite" data-testid="mission-board-section-client">
              <header className={styles.head}>
                <span className={styles.kicker}>Client contract {index + 1} / {count}</span>
                <span className={styles.markSlot}><ClientMark initial={client?.initial ?? 'OP'} color={client?.color ?? 'var(--ln-board-teal)'} uiRole={client?.uiRole ?? 'starter'} clientId={client?.id} size={48} /></span>
                {wsw && <span className={styles.wsw} title={wsw.title} data-testid="mission-board-wsw"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="4" width="6" height="6" /><rect x="14" y="4" width="6" height="6" /><rect x="4" y="14" width="6" height="6" /><rect x="14" y="14" width="6" height="6" /></svg>{wsw.label}</span>}
              </header>
              <h2 className={styles.title}>{card.mission.title}</h2>
              <div className={styles.facts}>
                <div className={styles.fact}><span>VALUE</span><strong><i className={styles.coin} aria-hidden="true">{FRANC}</i>{formatFrancs(card.displayPayout, { compact: true })}</strong></div>
                <div className={styles.fact}><span>CLIENT LEVEL</span><strong>{client ? `L${clientLevel}` : 'PROGRAM'}</strong></div>
              </div>
              <div className={styles.cargo}>
                <span>REQUIRED CARGO</span>
                <div className={styles.ores}>
                  {Object.entries(card.mission.requires.minerals).map(([id, amount]) => {
                    const meta = catalog.minerals[id]
                    if (!meta) return null
                    return <span key={id} className={styles.ore} title={meta.name}><MineralRock shape={meta.shape} color={meta.color} />{amount}</span>
                  })}
                </div>
              </div>
              <img className={styles.rocket} src={rocketImg} alt="" />
              {!card.unlocked && card.lockedDetail && <p className={styles.lockline}>{card.lockedDetail}</p>}
              <button type="button" className={styles.accept} data-testid={`mission-accept-${card.mission.id}`} disabled={!card.unlocked || tutorialBlocked} onClick={() => onAccept(card.mission.id)}>ACCEPT &amp; PREPARE</button>
            </article>
            <div className={styles.dots}>
              {cards.map((item, dot) => <button key={item.mission.id} type="button" className={styles.dotBtn} data-active={dot === index} aria-label={`Contract ${dot + 1}`} onClick={() => onSelectRelative(dot - index)}><i /></button>)}
            </div>
          </div> : <div className={styles.empty}>
            {onboardingComplete ? <>
              <strong>NO CONTRACTS ARE OFFERED YET</strong>
              <span>Free Ops opens once the Earth storage silo is built.</span>
              <button type="button" className={styles.accept} onClick={onOpenBuild}>BUILD STORAGE SILO</button>
            </> : <strong>NO COMPATIBLE CLIENT SIGNALS</strong>}
          </div>)}

          {tab === 'program' && <div className={styles.chain} data-testid="mission-board-program">
            {steps.map((step, stepIndex) => <div key={step.id}>
              <article className={styles.step} data-state={step.state} data-testid={`program-step-${step.id}`}>
                <span className={styles.glyph} aria-hidden="true"><StepGlyph kind={step.kind} /></span>
                <div>
                  <h3>{step.title}</h3>
                  <p>{step.detail}</p>
                  {step.state === 'locked' && step.lockLine && <p>{step.lockLine}</p>}
                </div>
                <div className={styles.mark}>
                  {step.state === 'done' && <span className={styles.doneMark} aria-label="Done"><CheckIcon /></span>}
                  {step.state === 'locked' && <span aria-label="Locked"><LockIcon /></span>}
                  {(step.state === 'current' || step.state === 'available') && <button type="button" className={styles.start} data-testid={`program-start-${step.id}`} onClick={() => startStep(step)}>{step.state === 'current' ? 'START' : 'ACCEPT'}</button>}
                </div>
              </article>
              {stepIndex < steps.length - 1 && <div className={styles.join} aria-hidden="true"><DownIcon /></div>}
            </div>)}
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
    </section>
    {settingsOpen && <SettingsSheet onClose={() => setSettingsOpen(false)} />}
    {friendsOpen && <FriendsSheet onClose={() => setFriendsOpen(false)} />}
  </div>
}
