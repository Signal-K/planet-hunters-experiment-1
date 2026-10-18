'use client'

import { useEffect, useMemo, useState, type CSSProperties } from 'react'
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
import styles from './MissionBoard.module.css'

// The board stands on the live base: the same plots and kit the Hub draws.

interface MissionBoardProps {
  catalog: Catalog
  player: Player
  cards: MissionRelayCardModel[]
  selectedIndex: number
  onSelectRelative: (offset: number) => void
  onSelectMission: (id: string) => void
  onAccept: (id: string, disposition?: 'store' | 'sell') => void
  onClose: () => void
  onOpenLog: () => void
  onOpenBuild: () => void
  onPickTarget?: (id: string) => void
  /** The rocket now stands on the pad in the scene behind the board. */
  rocketImg?: string
  tutorialBlocked: boolean
  onboardingComplete: boolean
}

function ArrowIcon({ direction }: { direction: 'left' | 'right' }) {
  return direction === 'left'
    ? <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 6 9 12l6 6" /></svg>
    : <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 6 6 6-6 6" /></svg>
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
  const ink = '#0f1012'
  return <span className={styles.rock} aria-hidden="true">
    <svg viewBox="0 0 24 24">
      {shape === 'diamond' && <path d="M12 2.5 20 9.5 12 21.5 4 9.5Z" fill={color} stroke={ink} strokeWidth="1.6" strokeLinejoin="round" />}
      {shape === 'triangle' && <path d="M12 3 21.5 20.5H2.5Z" fill={color} stroke={ink} strokeWidth="1.6" strokeLinejoin="round" />}
      {shape === 'rect' && <path d="M4 9h16v11H4zM7.5 9 9 4.5h6L17 9" fill={color} stroke={ink} strokeWidth="1.6" strokeLinejoin="round" />}
      {(!shape || shape === 'circle') && <path d="M8 7.5c2.2-3 7.2-2.4 8.4.4 2.6.4 3.4 4.2 1.2 6.2-.6 2.8-4.2 4.6-7.6 3.2C6.2 16.2 4.6 12.2 6.2 9.4 6.4 8.6 7 7.8 8 7.5Z" fill={color} stroke={ink} strokeWidth="1.6" strokeLinejoin="round" />}
    </svg>
  </span>
}

type Target = Catalog['targets'][number]
type MapView = 'system' | 'belt'
type MapMode = 'route' | 'pick' | 'ambient'

const SUN = { x: 4, y: 44 }
const UX = 10.5
const UY = 4.4
const BELT_R = 5
const STAR_TINTS = ['#ecebe8', '#ecebe8', '#bcd2ff', '#ffd9e6', '#d9c8ff', '#b9eaf5']

function spread(id: string): number {
  let h = 0
  for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) >>> 0
  return ((h % 1000) / 1000) * 2 - 1
}

function lcg(seed: number) {
  let s = seed
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296 }
}

const STARS = (() => {
  const rand = lcg(7)
  return Array.from({ length: 110 }, () => ({
    x: rand() * 100, y: rand() * 100, size: 1.5 + rand() * 2.5, glow: 0.3 + rand() * 0.6,
    tint: STAR_TINTS[Math.floor(rand() * STAR_TINTS.length)],
  }))
})()

const orbitPoint = (r: number, angle: number) => ({ x: SUN.x + r * UX * Math.cos(angle), y: SUN.y + r * UY * Math.sin(angle) })
const EARTH_POS = orbitPoint(1.5, 1.0)
const BELT_ROCKS = (() => {
  const rand = lcg(31)
  return Array.from({ length: 260 }, () => ({ ...orbitPoint(BELT_R + (rand() - 0.5) * 1.1, (rand() * 2 - 1) * 1.4), size: 2 + rand() * 3.5, glow: 0.4 + rand() * 0.5 }))
})()
const BELT_FIELD = (() => {
  const rand = lcg(53)
  return Array.from({ length: 70 }, () => ({ x: 4 + rand() * 92, y: 14 + rand() * 56, size: 3 + rand() * 7, glow: 0.15 + rand() * 0.35 }))
})()

/** Asteroids sit in one belt; zoomed in, they spread across the screen. */
function beltLayout(list: Target[]): Record<string, { x: number; y: number }> {
  const cols = 3
  const rows = Math.max(1, Math.ceil(list.length / cols))
  return Object.fromEntries(list.map((t, i) => [t.id, {
    x: 18 + ((i % cols) + 0.5) * (66 / cols) + spread(`${t.id}x`) * 3,
    y: 24 + (Math.floor(i / cols) + 0.5) * (36 / rows) + spread(`${t.id}y`) * 2.5,
  }]))
}

const shortName = (name: string) => name.replace(/^\d+\s+/, '')

interface GalaxyMapProps {
  targets: Target[]
  mode: MapMode
  view: MapView
  onView: (view: MapView) => void
  stops?: string[]
  candidates?: string[]
  selectedId?: string | null
  onPick?: (id: string) => void
}

/** The whole screen: sun, orbits, planets and an asteroid belt you can zoom into. Controls are drawn over it. */
function GalaxyMap({ targets, mode, view, onView, stops = [], candidates = [], selectedId = null, onPick }: GalaxyMapProps) {
  const lit = new Set([...stops, ...candidates, ...(selectedId ? [selectedId] : [])])
  const pickable = mode === 'pick'
  const real = targets.filter(t => t.type !== 'exoplanet')
  const planets = real.filter(t => t.type !== 'asteroid')
  const asteroids = real.filter(t => t.type === 'asteroid')
  const belt = beltLayout(asteroids)
  const litAsteroid = asteroids.find(t => lit.has(t.id))
  const anchor = litAsteroid ? orbitPoint(BELT_R, spread(litAsteroid.id) * 1.1) : orbitPoint(BELT_R, -0.75)
  const planetPos = (t: Target) => orbitPoint(t.orbit, spread(t.id) * 0.85)
  const pos = (t: Target) => t.type === 'asteroid' ? anchor : planetPos(t)
  const route = [EARTH_POS, ...(stops.length ? stops : candidates).flatMap(id => {
    const t = real.find(x => x.id === id)
    return t ? [pos(t)] : []
  })]
  const style = (p: { x: number; y: number }) => ({ left: `${p.x}%`, top: `${p.y}%` })
  const line = (pts: { x: number; y: number }[]) => pts.map((p, i) => `${i ? 'L' : 'M'}${p.x.toFixed(2)} ${p.y.toFixed(2)}`).join(' ')
  const node = (t: Target, p: { x: number; y: number }, label: string) => pickable
    ? <button key={t.id} type="button" className={styles.gxNode}
      data-lit={lit.has(t.id) || undefined} data-selected={t.id === selectedId || undefined} data-route={stops.includes(t.id) || undefined}
      style={style(p)} aria-label={t.name} aria-pressed={t.id === selectedId} data-testid={`map-node-${t.id}`} onClick={() => onPick?.(t.id)}>
      <i /><span>{label}</span>
    </button>
    : <div key={t.id} className={`${styles.gxNode} ${styles.gxStaticNode}`}
      data-lit={lit.has(t.id) || undefined} data-route={stops.includes(t.id) || undefined}
      style={style(p)} aria-label={t.name} data-testid={`map-node-${t.id}`}>
      <i /><span>{label}</span>
    </div>
  return <div className={styles.gx} data-view={view} data-mode={mode} data-testid="galaxy-map" aria-hidden={mode === 'ambient' || undefined}>
    {STARS.map((s, i) => <i key={i} className={styles.gxStar} style={{ left: `${s.x}%`, top: `${s.y}%`, width: s.size, height: s.size, opacity: s.glow, background: s.tint, color: s.tint }} />)}
    {view === 'system' ? <>
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        {[1, 2, 3, 4, 6, 7].map(o => <ellipse key={o} cx={SUN.x} cy={SUN.y} rx={o * UX} ry={o * UY} className={styles.gxRing} />)}
        {mode !== 'ambient' && route.length > 1 && (stops.length > 0
          ? <path d={line(route)} className={styles.gxRoute} />
          : route.slice(1).map((p, i) => <path key={i} d={line([route[0], p])} className={styles.gxSpoke} />))}
      </svg>
      {BELT_ROCKS.map((r, i) => <i key={i} className={styles.gxRock} style={{ ...style(r), width: r.size, height: r.size, opacity: r.glow }} />)}
      <i className={styles.gxSun} style={style(SUN)} />
      {mode !== 'ambient' && <>
        <div className={`${styles.gxNode} ${styles.gxStaticNode}`} data-home style={style(EARTH_POS)} aria-label="Earth"><i /><span>Earth</span></div>
        {planets.map(t => node(t, planetPos(t), t.name))}
        <button type="button" className={styles.gxBelt} data-lit={litAsteroid ? true : undefined} style={style(anchor)} data-testid="map-belt" onClick={() => onView('belt')}>
          <i /><span>Asteroid belt<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6" /><path d="m15 15 5 5M10.5 8v5M8 10.5h5" /></svg></span>
        </button>
      </>}
    </> : <>
      {BELT_FIELD.map((r, i) => <i key={i} className={styles.gxRock} style={{ ...style(r), width: r.size, height: r.size, opacity: r.glow }} />)}
      {asteroids.map(t => node(t, belt[t.id], shortName(t.name)))}
      <button type="button" className={styles.gxBack} onClick={() => onView('system')} data-testid="map-back"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 6 9 12l6 6" /></svg>Solar system</button>
    </>}
  </div>
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
  catalog, player, cards, selectedIndex, onSelectRelative, onSelectMission, onAccept, onClose, onOpenLog, onOpenBuild, onPickTarget,
  tutorialBlocked, onboardingComplete,
}: MissionBoardProps) {
  const [tab, setTab] = useState<MissionBoardTab>(() => takeMissionBoardTab() ?? 'contracts')
  const help = useHelp('missions')
  const { now, orionidsNow } = boardClock()
  const steps = useMemo(() => programChain(catalog, player, now), [catalog, player, now])
  const events = useMemo(() => eventsBoard(now, player.badges, orionidsNow), [now, orionidsNow, player.badges])
  const freeRuns = useMemo(() => catalog.missions.filter(m => m.id.startsWith('self-directed-') && !m.locked), [catalog.missions])
  const [contractTargetId, setContractTargetId] = useState<string | null>(null)
  const visibleCards = contractTargetId ? cards.filter(item => item.targetIds.includes(contractTargetId)) : cards
  const selectedCard = cards[Math.min(selectedIndex, Math.max(0, cards.length - 1))]
  const count = visibleCards.length
  const visibleSelectedIndex = selectedCard ? visibleCards.findIndex(item => item.mission.id === selectedCard.mission.id) : -1
  const index = count === 0 ? 0 : visibleSelectedIndex >= 0 ? visibleSelectedIndex : 0
  const card = visibleCards[index]
  const client = card?.client
  const clientLevel = client ? clientAffinityLevel(player.clientMissions[client.id] ?? 0) : 0
  const paging = tab === 'contracts' && count > 1
  const [view, setView] = useState<MapView>('system')
  const [pickedId, setPickedId] = useState<string | null>(null)
  const [runId, setRunId] = useState<string | null>(null)
  const picked = pickedId ? catalog.targets.find(t => t.id === pickedId) ?? null : null
  const pickedRuns = picked ? freeRuns.filter(run => Object.keys(run.requires.minerals).some(m => picked.minerals.includes(m))) : []
  const pickedRun = pickedRuns.find(run => run.id === runId) ?? pickedRuns[0] ?? null
  const routeIds = card ? [card.mission.targetId, card.mission.deliveryTargetId].flatMap(id => id && catalog.targets.some(t => t.id === id) ? [id] : []) : []
  const candidateIds = card && routeIds.length === 0
    ? catalog.targets.filter(t => t.type !== 'exoplanet' && Object.keys(card.mission.requires.minerals).some(m => t.minerals.includes(m))).slice(0, 4).map(t => t.id)
    : []
  const mapMode: MapMode = tab === 'contracts' || tab === 'free' ? 'pick' : 'ambient'

  useEffect(() => {
    if (tab !== 'contracts' || !card) return
    const destination = catalog.targets.find(target => target.id === card.mission.targetId)
    setView(destination?.type === 'asteroid' ? 'belt' : 'system')
  }, [card?.mission.id, catalog.targets, tab])

  const pickContractTarget = (id: string) => {
    const next = contractTargetId === id ? null : id
    setContractTargetId(next)
    if (!next) return
    const first = cards.find(item => item.targetIds.includes(next))
    if (first) onSelectMission(first.mission.id)
  }

  const selectVisibleRelative = (offset: number) => {
    if (!contractTargetId) return onSelectRelative(offset)
    if (visibleCards.length === 0) return
    const next = (index + offset + visibleCards.length) % visibleCards.length
    onSelectMission(visibleCards[next].mission.id)
  }

  const startStep = (step: ProgramStep) => {
    if (step.state === 'locked' || step.state === 'done') return
    onAccept(step.id, step.kind === 'focus' ? 'store' : undefined)
  }

  const signalColor = client?.color ?? 'var(--ln-board-amber)'
  const tabButtons = <>
    <button type="button" className={styles.tab} aria-label="Contracts" data-tab="contracts" data-active={tab === 'contracts'} data-testid="mission-board-tab-contracts" onClick={() => setTab('contracts')}><ChartIcon /><span className={styles.tabLabel}>Contracts</span></button>
    {player.freeOperations && <button type="button" className={styles.tab} aria-label="Free run" data-tab="free" data-active={tab === 'free'} data-testid="mission-board-tab-free" onClick={() => setTab('free')}><PickIcon /><span className={styles.tabLabel}>Free run</span></button>}
    <button type="button" className={styles.tab} aria-label="Program" data-tab="program" data-active={tab === 'program'} data-testid="mission-board-tab-program" onClick={() => setTab('program')}><ClipboardIcon /><span className={styles.tabLabel}>Program</span></button>
    <button type="button" className={styles.tab} aria-label="Events" data-tab="events" data-active={tab === 'events'} data-testid="mission-board-tab-events" onClick={() => setTab('events')}>
      <StarIcon /><span className={styles.tabLabel}>Events</span>
      {events.attention && <i className={styles.dot} data-testid="mission-board-events-dot" aria-label="Event live or upcoming" />}
    </button>
    <button type="button" className={styles.log} data-testid="mission-board-log" onClick={onOpenLog}>LOG</button>
  </>

  return <div className={styles.scene} data-testid="mission-setup-scaffold" data-screen="missions" data-paging={paging ? 'true' : 'false'} data-tab={tab} data-contract-target={contractTargetId ?? undefined}>
    <section className={styles.dispatch} style={{ '--signal': signalColor } as CSSProperties} data-testid="mission-board" aria-label="Mission board">
      <nav className={styles.rail} aria-label="Mission board">
        <button type="button" className={`${styles.round} ${styles.railClose}`} data-testid="mission-board-close" aria-label="Close" onClick={onClose}><ArrowIcon direction="left" /></button>
        {tabButtons}
        {help.button && <div className={styles.railHelp}>{help.button}</div>}
      </nav>
      <GalaxyMap targets={catalog.targets} mode={mapMode} view={view} onView={setView} stops={tab === 'contracts' ? routeIds : []} candidates={tab === 'contracts' ? candidateIds : []}
        selectedId={tab === 'contracts' ? contractTargetId : tab === 'free' ? pickedId : null} onPick={id => {
          if (tab === 'contracts') pickContractTarget(id)
          else { setPickedId(id); setRunId(null) }
        }} />
      {tab === 'contracts' ? (card ? <>
        <article className={styles.dock} aria-live="polite" data-testid="mission-board-section-client">
          <header className={styles.dockHead}>
            <ClientMark initial={client?.initial ?? 'OP'} color={client?.color ?? 'var(--ln-board-amber)'} uiRole={client?.uiRole ?? 'starter'} clientId={client?.id} size={36} />
            <div className={styles.dockWho}>
              <span>{client ? `${client.name} · L${clientLevel}` : 'Your program'}</span>
              <h2>{card.mission.title}</h2>
            </div>
            {paging && <div className={styles.dockNav}>
              <button type="button" className={styles.round} data-testid="mission-board-prev" aria-label="Previous contract" onClick={() => selectVisibleRelative(-1)}><ArrowIcon direction="left" /></button>
              <span>{index + 1}/{count}</span>
              <button type="button" className={styles.round} data-testid="mission-board-next" aria-label="Next contract" onClick={() => selectVisibleRelative(1)}><ArrowIcon direction="right" /></button>
            </div>}
          </header>
          {card.mission.brief && <p className={styles.dockBrief} data-testid="mission-brief">{card.mission.brief}</p>}
          {!card.unlocked && card.lockedDetail && <p className={styles.dockBrief}>{card.lockedDetail}</p>}
          <div className={styles.dockDeal}>
            <div className={styles.dockCargo} aria-label="Cargo">
              {Object.entries(card.mission.requires.minerals).map(([id, amount]) => {
                const meta = catalog.minerals[id]
                if (!meta) return null
                return <span key={id} className={styles.crate}><MineralRock shape={meta.shape} color={meta.color} /><b>{amount}</b><em>{meta.name}</em></span>
              })}
            </div>
            <strong className={styles.pay}><i className={styles.coin} aria-hidden="true">{FRANC}</i>{formatFrancs(card.displayPayout, { compact: true })}</strong>
            <button type="button" className={styles.take} data-testid={`mission-accept-${card.mission.id}`} disabled={!card.unlocked || tutorialBlocked} onClick={() => onAccept(card.mission.id)}>ACCEPT</button>
          </div>
        </article>
      </> : <article className={styles.dock} data-testid="mission-board-section-client">
        {onboardingComplete ? <>
          <header className={styles.dockHead}><div className={styles.dockWho}><h2>No client signals yet</h2></div></header>
          <p className={styles.dockBrief}>Free Ops opens once the Earth storage silo is built.</p>
          <div className={styles.dockDeal}><button type="button" className={styles.take} onClick={onOpenBuild}>BUILD STORAGE SILO</button></div>
        </> : contractTargetId ? <>
          <header className={styles.dockHead}><div className={styles.dockWho}><span>Destination filter</span><h2>No contracts for this location</h2></div></header>
          <p className={styles.dockBrief}>Choose another body or tap the selected location again to show every contract.</p>
        </> : <header className={styles.dockHead}><div className={styles.dockWho}><h2>No compatible client signals</h2></div></header>}
      </article>) : tab === 'free' ? <article className={styles.dock} data-testid="mission-board-free">
        <header className={styles.dockHead}>
          <div className={styles.dockWho}>
            <span>Free run · no client, sell at market price</span>
            <h2>{picked ? picked.name : 'Choose a site on the map'}</h2>
          </div>
        </header>
        {!picked && <p className={styles.dockBrief}>Tap a planet, or open the asteroid belt, to pick where to mine.</p>}
        {picked && <p className={styles.dockBrief}>{picked.brief}</p>}
        {picked && pickedRuns.length > 1 && <div className={styles.dockRuns} role="group" aria-label="Run">
          {pickedRuns.map(run => <button key={run.id} type="button" data-testid={`free-run-${run.id}`} data-on={run.id === pickedRun?.id || undefined} onClick={() => setRunId(run.id)}>
            {Object.entries(run.requires.minerals).map(([id, amount]) => `${amount} ${catalog.minerals[id]?.name ?? id}`).join(', ')}
          </button>)}
        </div>}
        {picked && pickedRuns.length === 0 && <p className={styles.dockBrief}>No free run mines this site yet.</p>}
        <div className={styles.dockDeal}>
          <strong className={styles.pay}>{pickedRun ? Object.entries(pickedRun.requires.minerals).map(([id, amount]) => `${amount} ${catalog.minerals[id]?.name ?? id}`).join(', ') : ''}</strong>
          <button type="button" className={styles.take} data-testid="free-run-start" disabled={!picked || !pickedRun}
            onClick={() => { if (!picked || !pickedRun) return; onAccept(pickedRun.id); onPickTarget?.(picked.id) }}>START RUN</button>
        </div>
      </article> : <div className={styles.sheet}>
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
            <article className={styles.eventHero} data-testid="events-orionids">
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
      </div>}
    </section>
    {help.layer}
  </div>
}
