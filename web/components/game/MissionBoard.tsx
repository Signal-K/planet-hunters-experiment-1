'use client'

import { agencySummary } from '@/lib/agency/programme'

import { useEffect, useMemo, useState, type CSSProperties } from 'react'
import { formatCurrency } from '@/lib/format'
import type { Catalog } from '@/lib/catalog'
import type { Player } from '@/lib/game-types'
import type { MissionRelayCardModel } from '@/lib/hooks/useMissionRelayModels'
import { clientAffinityLevel } from '@/lib/data/daily-client-missions'
import { FRANC, formatFrancs } from '@/lib/format'
import { isDevLauncherEnabled } from '@/lib/devAccess'
import {
  ATLAS_ORIONIDS_CHECKIN,
  orionidsDevForced,
  orionidsForcedInstant,
  orionidsTeaserDevForced,
  orionidsTeaserForcedInstant,
  skyEventNow,
  isOrionidsWindow,
} from '@/lib/data/sky-events'
import { ORIONIDS_FRAGMENT_GOAL, ORIONIDS_NIGHT_RUN_ID } from '@/lib/data/missions'
import { getShower, showerForRunMission } from '@/lib/data/showers'
import { SPECIAL_PREFIX, masteryBonus, showerSpecials, type SpecialView } from '@/lib/orionids/special-missions'
import { chainNextScreen, getShowerChain } from '@/lib/orionids/chain'
import { FRAGMENT_REDEEM_BATCH, FRAGMENTS_PER_FIREBALL, heldFragments } from '@/lib/orionids/fragments'
import {
  eventsBoard,
  programChain,
  type ProgramStep,
  type SkyBoardCard,
} from '@/lib/mission-board-view'
import { PROBE_CONTRACT_PREFIX, PROBE_RUN_PREFIX } from '@/lib/probes/probe-offers'
import { clearMissionBoardTab, lastMissionBoardTab, rememberMissionBoardTab, pendingMissionBoardEvent, pendingMissionBoardMineral, pendingMissionBoardSite, pendingMissionBoardTab, type MissionBoardTab } from '@/lib/mission-board-nav'
import ClientMark from '@/components/ui/ClientMark'
import { CONTRACT_GROUPS, CONTRACT_GROUP_LABEL, contractGroup, contractGroupCounts, type ContractGroup } from '@/lib/contract-groups'
import { orionidsArchiveUnlocked, orionidsRunAvailable } from '@/lib/orionids/access'
import ScreenFrame from '@/components/layout/frame/ScreenFrame'
import styles from './MissionBoard.module.css'
import { formatViewingWindow, localSkyEventWindow, ORIONIDS_EPHEMERIS } from '@/lib/data/sky-event-window'
import SolarOrbitGlobe from './screens/SolarOrbitGlobe'
import { terrainLookForTarget } from '@/lib/takeon/terrainColour'
import { CONSTRUCTION_COMING_LATER } from '@/lib/deferred-features'
import { agencyStepLocation } from '@/lib/location-missions'
import { missionTypePrimer } from '@/lib/data/mission-primers'
import type { Mission } from '@/lib/data/types'
import { moonParent } from '@/lib/solar-moons'

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
  onOpenPlanner?: () => void
  onOpenLog: () => void
  onOpenBuild: () => void
  onOpenEvent: (screen: 'launchpad' | 'asteroid-discovery' | 'saturn-storm-search' | 'radio-meteors') => void
  onPickTarget?: (id: string) => void
  onRedeemFragments?: () => void
  onCombineFragments?: () => void
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

const STEP_KIND_LABEL: Record<ProgramStep['kind'], string> = { instrument: 'Instrument', mining: 'Mining', focus: 'Focus' }
const STEP_STATE_LABEL: Record<ProgramStep['state'], string> = { done: 'Done', current: 'Next up', available: 'Open', locked: 'Locked' }

function StepGlyph({ kind }: { kind: ProgramStep['kind'] }) {
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
type MapView = 'system' | 'inner' | 'belt' | 'outer' | 'moons'
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
  return Array.from({ length: 56 }, () => ({
    x: rand() * 100, y: rand() * 100, size: 1.5 + rand() * 2.5, glow: 0.3 + rand() * 0.6,
    tint: STAR_TINTS[Math.floor(rand() * STAR_TINTS.length)],
  }))
})()

const orbitPoint = (r: number, angle: number) => ({ x: SUN.x + r * UX * Math.cos(angle), y: SUN.y + r * UY * Math.sin(angle) })
const EARTH_POS = orbitPoint(3, -0.4)
const REGION_EARTH_POS = { x: 38, y: 42 }
const BELT_ROCKS = (() => {
  const rand = lcg(31)
  return Array.from({ length: 96 }, () => ({ ...orbitPoint(BELT_R + (rand() - 0.5) * 1.1, (rand() * 2 - 1) * 1.4), size: 2 + rand() * 3.5, glow: 0.4 + rand() * 0.5 }))
})()
const BELT_FIELD = (() => {
  const rand = lcg(53)
  return Array.from({ length: 32 }, () => ({ x: 4 + rand() * 92, y: 14 + rand() * 56, size: 3 + rand() * 7, glow: 0.15 + rand() * 0.35 }))
})()

/** A stable, schematic field; positions do not imply current orbital locations. */
function beltLayout(list: Target[]): Record<string, { x: number; y: number }> {
  const places: Record<string, { x: number; y: number }> = {
    bennu: { x: 18, y: 31 }, itokawa: { x: 48, y: 20 }, eros: { x: 75, y: 32 },
    ryugu: { x: 33, y: 48 }, vesta: { x: 66, y: 52 }, psyche: { x: 17, y: 69 },
    ceres: { x: 47, y: 77 }, lutetia: { x: 67, y: 72 },
  }
  return Object.fromEntries(list.map(t => [t.id, places[t.id] ?? {
    x: 15 + (spread(`${t.id}x`) + 1) * 35,
    y: 20 + (spread(`${t.id}y`) + 1) * 30,
  }]))
}

function regionLayout(list: Target[]): Record<string, { x: number; y: number }> {
  const count = Math.max(1, list.length)
  return Object.fromEntries(list.map((target, index) => {
    const angle = (-0.75 + (index / count) * Math.PI * 1.5) + spread(target.id) * 0.18
    const radius = 20 + (index % 2) * 9
    return [target.id, { x: 49 + Math.cos(angle) * radius, y: 44 + Math.sin(angle) * radius * 0.7 }]
  }))
}

const shortName = (name: string) => name.replace(/^\d+\s+/, '')

const ignoreGlobeReady = () => {}
function MapGlobe({ target }: { target?: Target }) {
  const gasColours: Record<string, readonly [string, string, string]> = { jupiter: ['#d6b79a', '#b77c60', '#f0dcc4'], saturn: ['#e1cb9f', '#b59b70', '#f1e4bd'], uranus: ['#8bd5d6', '#5dabb6', '#c0e8e3'], neptune: ['#427cce', '#28529c', '#8bb8ef'] }
  const colours = target ? gasColours[target.id] ?? terrainLookForTarget(target).ground : ['#4c9172', '#326d9f', '#b6d5ce']
  return <i className={styles.gxPlanet} data-planet={target?.id}>
    <SolarOrbitGlobe targetId={target?.id ?? 'earth'} colours={colours} scale={1} opacity={1} landable={target?.archetype !== 'gas-giant'} mapIcon onReady={ignoreGlobeReady} />
  </i>
}

interface GalaxyMapProps {
  targets: Target[]
  mode: MapMode
  view: MapView
  onView: (view: MapView) => void
  stops?: string[]
  candidates?: string[]
  selectedId?: string | null
  onPick?: (id: string) => void
  locationOpen?: boolean
  moonParentId?: string | null
  onOpenMoons?: (id: string) => void
  shipTargets?: string[]
}

/** The whole screen: sun, orbits, planets and an asteroid belt you can zoom into. Controls are drawn over it. */
export function GalaxyMap({ targets, mode, view, onView, stops = [], candidates = [], selectedId = null, onPick, locationOpen = false, moonParentId = null, onOpenMoons, shipTargets = [] }: GalaxyMapProps) {
  const lit = new Set([...stops, ...candidates, ...(selectedId ? [selectedId] : [])])
  const pickable = mode === 'pick'
  const real = targets.filter(t => t.type !== 'exoplanet')
  const planets = real.filter(t => t.type !== 'asteroid' && !moonParent(t.id))
  const moons = real.filter(t => moonParent(t.id) === moonParentId)
  const parent = planets.find(t => t.id === moonParentId)
  const asteroids = real.filter(t => t.type === 'asteroid')
  const shownPlanets = mode === 'route' ? planets.filter(t => lit.has(t.id)) : planets
  const shownAsteroids = mode === 'route' ? asteroids.filter(t => lit.has(t.id)) : asteroids
  const innerPlanets = planets.filter(t => t.orbit <= 4)
  const outerPlanets = planets.filter(t => t.orbit > 4)
  const belt = beltLayout(asteroids)
  const inner = regionLayout(innerPlanets)
  const outer = regionLayout(outerPlanets)
  const litAsteroid = asteroids.find(t => lit.has(t.id))
  const anchor = litAsteroid ? orbitPoint(BELT_R, spread(litAsteroid.id) * 1.1) : orbitPoint(BELT_R, -0.75)
  // These are illustrative positions, not ephemerides. Separate the inner
  // planets so their globes and labels remain legible on their own rings.
  const planetAngles: Record<string, number> = { mercury: -0.9, venus: 0.5, mars: 0.5 }
  const planetPos = (t: Target) => orbitPoint(t.orbit, planetAngles[t.id] ?? spread(t.id) * 0.85)
  const pos = (t: Target) => {
    const parentId = moonParent(t.id)
    const parentTarget = planets.find(planet => planet.id === parentId)
    return t.type === 'asteroid' ? anchor : parentId === 'earth' ? EARTH_POS : planetPos(parentTarget ?? t)
  }
  const route = [EARTH_POS, ...(stops.length ? stops : candidates).flatMap(id => {
    const t = real.find(x => x.id === id)
    return t ? [pos(t)] : []
  })]
  const style = (p: { x: number; y: number }) => ({ left: `${p.x}%`, top: `${p.y}%` })
  const line = (pts: { x: number; y: number }[]) => pts.map((p, i) => `${i ? 'L' : 'M'}${p.x.toFixed(2)} ${p.y.toFixed(2)}`).join(' ')
  const node = (t: Target, p: { x: number; y: number }, label: string) => pickable
    ? <button key={t.id} type="button" className={styles.gxNode}
      data-lit={lit.has(t.id) || undefined} data-selected={t.id === selectedId || undefined} data-route={stops.includes(t.id) || undefined}
      style={style(p)} aria-label={t.name} aria-pressed={t.id === selectedId} data-testid={`map-node-${t.id}`} onClick={() => { onPick?.(t.id); if (view !== 'moons' && real.some(body => moonParent(body.id) === t.id)) onOpenMoons?.(t.id) }}>
      <MapGlobe target={t} /><span>{label}</span>
    </button>
    : <div key={t.id} className={`${styles.gxNode} ${styles.gxStaticNode}`}
      data-lit={lit.has(t.id) || undefined} data-route={stops.includes(t.id) || undefined}
      style={style(p)} aria-label={t.name} data-testid={`map-node-${t.id}`}>
      <MapGlobe target={t} /><span>{label}</span>
    </div>
  const earth = (p: { x: number; y: number }) => pickable
    ? <button type="button" className={styles.gxNode} data-home data-selected={selectedId === 'earth' || undefined} style={style(p)} aria-label="Earth" aria-pressed={selectedId === 'earth'} data-testid="map-node-earth" onClick={() => onPick?.('earth')}><MapGlobe /><span>Earth</span></button>
    : <div className={`${styles.gxNode} ${styles.gxStaticNode}`} data-home style={style(p)} aria-label="Earth"><MapGlobe /><span>Earth</span></div>
  return <div className={styles.gx} data-view={view} data-mode={mode} data-location-open={locationOpen || undefined} data-testid="galaxy-map" aria-hidden={mode === 'ambient' || undefined}>
    {STARS.map((s, i) => <i key={i} className={styles.gxStar} style={{ left: `${s.x}%`, top: `${s.y}%`, width: s.size, height: s.size, opacity: s.glow, background: s.tint, color: s.tint }} />)}
    {view === 'system' ? <>
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        <ellipse cx="18" cy="44" rx="20" ry="17" className={styles.gxRegion} />
        <ellipse cx="62" cy="44" rx="25" ry="24" className={styles.gxRegion} />
        <ellipse cx="92" cy="44" rx="21" ry="29" className={styles.gxRegion} />
        {[1, 2, 3, 4, 6, 7, 8, 9].map(o => <ellipse key={o} cx={SUN.x} cy={SUN.y} rx={o * UX} ry={o * UY} className={styles.gxRing} />)}
        {mode === 'pick' && shipTargets.map((id, index) => {
          const target = real.find(body => body.id === id)
          if (!target) return null
          const destination = pos(target)
          const parentId = moonParent(target.id)
          const uprightPositions: Record<string, { x: number; y: number }> = {
            mercury: { x: 25, y: 23 }, venus: { x: 62, y: 25 }, mars: { x: 62, y: 38 },
            jupiter: { x: 25, y: 60 }, saturn: { x: 62, y: 61 }, uranus: { x: 25, y: 73 }, neptune: { x: 62, y: 74 },
          }
          const uprightDestination = target.type === 'asteroid' ? { x: 30, y: 49 } : uprightPositions[parentId ?? target.id] ?? { x: 25, y: 36 }
          const ship = (path: string, className: string) => <g className={`${styles.gxShip} ${className}`} aria-label={`Ship toward ${target.name}`}>
            <path d="M-1.1,-0.65 L1.4,0 L-1.1,0.65 L-0.6,0 Z" />
            <animateMotion dur={`${14 + index * 3}s`} repeatCount="indefinite" rotate="auto" path={path} />
          </g>
          return <g key={`${id}-${index}`}>
            {ship(line([EARTH_POS, destination]), styles.gxShipWide)}
            {ship(line([{ x: 25, y: 36 }, uprightDestination]), styles.gxShipPortrait)}
          </g>
        })}
        {mode !== 'ambient' && route.length > 1 && (stops.length > 0
          ? <path d={line(route)} className={styles.gxRoute} />
          : route.slice(1).map((p, i) => <path key={i} d={line([route[0], p])} className={styles.gxSpoke} />))}
      </svg>
      {BELT_ROCKS.map((r, i) => <i key={i} className={styles.gxRock} style={{ ...style(r), width: r.size, height: r.size, opacity: r.glow }} />)}
      <i className={styles.gxSun} style={style(SUN)} />
      <span className={styles.gxRegionLabel} style={{ left: '13%', top: '68%' }}>Inner system</span>
      <span className={styles.gxRegionLabel} style={{ left: '54%', top: '73%' }}>Main belt</span>
      <span className={styles.gxRegionLabel} style={{ left: '83%', top: '78%' }}>Outer system</span>
      {mode !== 'ambient' && <>
        {earth(EARTH_POS)}
        {shownPlanets.map(t => node(t, planetPos(t), t.name))}
        <button type="button" className={styles.gxBelt} data-lit={litAsteroid ? true : undefined} style={style(anchor)} data-testid="map-belt" onClick={() => onView('belt')}>
          <i /><span>Asteroid belt<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6" /><path d="m15 15 5 5M10.5 8v5M8 10.5h5" /></svg></span>
        </button>
      </>}
        {mode === 'pick' && <button type="button" className={styles.gxRegionButton} data-testid="map-inner" style={{ left: '20%', top: '67%' }} onClick={() => onView('inner')}>Explore inner system</button>}
        {mode === 'pick' && <button type="button" className={styles.gxRegionButton} data-testid="map-outer" style={{ left: '84%', top: '76%' }} onClick={() => onView('outer')}>Explore outer system</button>}
    </> : view === 'moons' ? <>
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        <ellipse cx="42" cy="44" rx="27" ry="24" className={styles.gxRing} />
        <ellipse cx="42" cy="44" rx="38" ry="32" className={styles.gxRegion} />
      </svg>
      {moonParentId === 'earth' ? earth({ x: 42, y: 44 }) : parent && node(parent, { x: 42, y: 44 }, parent.name)}
      {moons.map((moon, index) => {
        const angle = -0.8 + index * Math.PI * 2 / Math.max(moons.length, 1)
        return node(moon, { x: 42 + Math.cos(angle) * 27, y: 44 + Math.sin(angle) * 24 }, shortName(moon.name))
      })}
      <span className={styles.gxRegionLabel} style={{ left: '50%', top: '84%' }}>{parent?.name ?? 'Earth'} · moons</span>
      <button type="button" className={styles.gxBack} onClick={() => onView('system')} data-testid="map-back" aria-label="Solar system"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 6 9 12l6 6" /></svg><span className={styles.gxBackLabel}>Solar system</span></button>
    </> : view === 'belt' ? <>
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        <ellipse cx="31" cy="39" rx="22" ry="25" className={styles.gxRegion} />
        <ellipse cx="68" cy="38" rx="25" ry="25" className={styles.gxRegion} />
        <ellipse cx="52" cy="66" rx="26" ry="19" className={styles.gxRegion} />
      </svg>
      {BELT_FIELD.map((r, i) => <i key={i} className={styles.gxRock} style={{ ...style(r), width: r.size, height: r.size, opacity: r.glow }} />)}
      <span className={styles.gxRegionLabel} style={{ left: '50%', top: '91%' }}>Asteroid locations · schematic</span>
      {shownAsteroids.map(t => node(t, belt[t.id], shortName(t.name)))}
      {mode !== 'ambient' && <button type="button" className={styles.gxBack} onClick={() => onView('system')} data-testid="map-back" aria-label="Solar system"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 6 9 12l6 6" /></svg><span className={styles.gxBackLabel}>Solar system</span></button>}
    </> : <>
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        <ellipse cx="50" cy="44" rx="34" ry="27" className={styles.gxRegion} />
        <ellipse cx="50" cy="44" rx="22" ry="17" className={styles.gxRing} />
        <ellipse cx="50" cy="44" rx="31" ry="24" className={styles.gxRing} />
        <path d={line(view === 'inner'
          ? [REGION_EARTH_POS, ...innerPlanets.map(target => inner[target.id])]
          : outerPlanets.map(target => outer[target.id]))} className={styles.gxLane} />
      </svg>
      <i className={styles.gxSun} style={{ left: '50%', top: '44%' }} />
      {view === 'inner' && earth(REGION_EARTH_POS)}
      {(view === 'inner' ? innerPlanets : outerPlanets).map(target => node(target, (view === 'inner' ? inner : outer)[target.id], target.name))}
      <span className={styles.gxRegionLabel} style={{ left: '50%', top: '77%' }}>{view === 'inner' ? 'Inner system' : 'Outer system'}</span>
      {mode !== 'ambient' && <button type="button" className={styles.gxBack} onClick={() => onView('system')} data-testid="map-back" aria-label="Solar system"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 6 9 12l6 6" /></svg><span className={styles.gxBackLabel}>Solar system</span></button>}
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

/** SSL-699: a pick for mining, a crane hook for construction, a lens for exploration. */
function ContractGroupGlyph({ group }: { group: ContractGroup }) {
  if (group === 'construction') return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20V6h14M4 6l4-3M18 6v5M15 11h6M18 11v3a2 2 0 1 1-2 2" /></svg>
  if (group === 'exploration') return <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10" cy="10" r="6" /><path d="M14.5 14.5 20 20M10 7v6M7 10h6" /></svg>
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20 14 10M11 5c4-2 8 0 9 4-3-2-6-2-9 0zM11 5l3 5" /></svg>
}

function MissionGlyph({ mission }: { mission: Mission }) {
  const payload = mission.payload
  if (payload?.type === 'rover') return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 16h14l-2-6H8l-3 6ZM10 10V7h4v3M12 7V4M4 19h16" /><circle cx="7" cy="19" r="2" /><circle cx="17" cy="19" r="2" /></svg>
  if (payload?.type === 'satellite' || payload?.type === 'deep-space-survey') return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 9 6 6-3 3-6-6zM6 12 3 9l3-3 3 3M15 15l3 3 3-3-3-3M14 5c3 0 5 2 5 5M14 2c5 0 8 3 8 8" /></svg>
  if (mission.survey?.scanRequired || mission.tag === 'SCIENCE') return <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="7" /><path d="M12 3v4M12 17v4M3 12h4M17 12h4M9 12l2 2 4-4" /></svg>
  if (mission.deliveryTargetId) return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 8h11v9H3zM14 11h4l3 3v3h-7M6 8V5h5v3" /><circle cx="7" cy="19" r="2" /><circle cx="18" cy="19" r="2" /></svg>
  return <ContractGroupGlyph group={contractGroup(mission)} />
}

function MissionAtAGlance({ mission }: { mission: Mission }) {
  const primer = missionTypePrimer(mission)
  const minerals = Object.entries(mission.requires.minerals)
  return <div className={styles.missionAtAGlance}><span>{primer.label}</span><span>{primer.steps.join('  ›  ')}</span>{minerals.length > 0 && <span>{minerals.map(([id, amount]) => `${amount} ${id}`).join(' · ')}</span>}</div>
}

function ProgramStepFallback({ step }: { step: ProgramStep }) {
  const telescope = /telescope/i.test(`${step.id} ${step.title}`)
  const satellite = /satellite|probe/i.test(`${step.id} ${step.title}`)
  const label = telescope ? 'Space telescope' : satellite ? 'Orbital deployment' : STEP_KIND_LABEL[step.kind]
  return <><span className={styles.locationIcon} data-kind="exploration">{telescope
    ? <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 14 11-8 3 4-11 8zM16 6l2-2 3 4-2 2M10 17l2 4M7 21h10" /></svg>
    : satellite ? <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 9 6 6-3 3-6-6zM6 12 3 9l3-3 3 3M15 15l3 3 3-3-3-3M14 5c3 0 5 2 5 5" /></svg>
    : <StepGlyph kind={step.kind} />}</span><div><strong>{step.title}</strong><small>{STEP_STATE_LABEL[step.state]}</small><div className={styles.missionAtAGlance}><span>{label}</span>{(telescope || satellite) && <span>Launch › Deploy › Return</span>}</div></div></>
}

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
  const label = card.status === 'live' ? 'LIVE' : card.status === 'upcoming' ? 'UPCOMING' : 'ENDED'
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

/**
 * SSL-657: the special missions a finished shower unlocks. Gold opens more than silver; the Orionids voucher and
 * Meteorite Mastery each open one more, and Mastery raises what all of them pay. Shown once the player holds a key.
 */
function EventSpecials({ eventId, player, onStart }: { eventId: string; player: Player; onStart: (special: SpecialView) => void }) {
  const flown = new Set((player.completedMissions ?? []).map(record => record.id))
  const specials = showerSpecials(eventId, player, flown)
  if (!specials.length || specials.every(special => special.state === 'locked')) return null
  const open = specials.filter(special => special.state !== 'locked').length
  const bonus = Math.round(masteryBonus(player) * 100)
  return (
    <details className={styles.specials} data-testid={`event-specials-${eventId}`}>
      <summary>Special missions · {open} unlocked{bonus ? ` · Mastery +${bonus}%` : ''}</summary>
      <ul>
        {specials.map(special => <li key={special.id} data-state={special.state} data-testid={`special-${special.id}`}>
          <span><b>{special.title}</b><small>{special.state === 'locked' ? special.needs : special.state === 'flown' ? 'Flown' : special.key === 'gold' ? 'Gold unlock' : special.key === 'badge' ? 'Badge unlock' : special.key === 'mastery' ? 'Mastery unlock' : 'Voucher unlock'}</small></span>
          {special.state === 'open' && <button type="button" data-testid={`special-start-${special.id}`} onClick={() => onStart(special)}>Start</button>}
        </li>)}
      </ul>
    </details>
  )
}

export default function MissionBoard({
  catalog, player, cards, selectedIndex, onSelectRelative, onSelectMission, onAccept, onClose, onOpenPlanner, onOpenLog, onOpenBuild, onOpenEvent, onPickTarget,
  onRedeemFragments, onCombineFragments, tutorialBlocked, onboardingComplete,
}: MissionBoardProps) {
  const [focusedEventId, setFocusedEventId] = useState(() => pendingMissionBoardEvent())
  const [requestedSite] = useState(() => pendingMissionBoardSite())
  // "Find aluminium" and other build shortfalls open the Free run map on the places that hold that mineral.
  const [sourceMineral, setSourceMineral] = useState<string | null>(() => pendingMissionBoardMineral())
  const [tab, setTab] = useState<MissionBoardTab>(() => {
    const requested = pendingMissionBoardTab() ?? lastMissionBoardTab()
    return requested === 'events' ? requested : 'free'
  })
  const { now, orionidsNow } = boardClock()
  const localOrionids = useMemo(() => localSkyEventWindow(ORIONIDS_EPHEMERIS, player.skyEventLocation), [player.skyEventLocation])
  const fleet = agencySummary(player, now)
  const steps = useMemo(() => programChain(catalog, player, now).filter(step => step.kind !== 'mining' && step.kind !== 'focus'), [catalog, player, now])
  const events = useMemo(
    () => eventsBoard(now, player.badges, orionidsNow, player.orionidsFinds, player.meteoriteMastery ?? 0, player.orionidsEventStage ?? 0, orionidsRunAvailable(player, orionidsNow), player),
    [now, orionidsNow, player.badges, player.meteoriteMastery, player.orionidsEventStage, player.orionidsFinds, player.orionidsFragments, player.researchPurchases],
  )
  const eventCards = events.groups.flatMap(group => group.cards)
  const event = eventCards.find(item => item.id === focusedEventId) ?? eventCards[0]
  const freeRuns = useMemo(() => catalog.missions.filter(m => m.id.startsWith('self-directed-') && !m.locked), [catalog.missions])
  const [contractTargetId, setContractTargetId] = useState<string | null>(() => tab === 'contracts' ? requestedSite?.targetId ?? null : null)
  const [programStepId, setProgramStepId] = useState<string | null>(null)
  const [requestedGroup, setContractGroupFilter] = useState<ContractGroup | null>(null)
  const siteCards = contractTargetId ? cards.filter(item => item.targetIds.includes(contractTargetId)) : cards
  const groupCounts = contractGroupCounts(siteCards.map(item => item.mission))
  const contractGroupFilter = groupCounts.some(row => row.group === requestedGroup) ? requestedGroup : null
  const visibleCards = contractGroupFilter ? siteCards.filter(item => contractGroup(item.mission) === contractGroupFilter) : siteCards
  const selectedCard = cards[Math.min(selectedIndex, Math.max(0, cards.length - 1))]
  const count = visibleCards.length
  const visibleSelectedIndex = selectedCard ? visibleCards.findIndex(item => item.mission.id === selectedCard.mission.id) : -1
  const index = count === 0 ? 0 : visibleSelectedIndex >= 0 ? visibleSelectedIndex : 0
  const card = visibleCards[index]
  const client = card?.client
  const clientLevel = client ? clientAffinityLevel(player.clientMissions[client.id] ?? 0) : 0
  const paging = tab === 'contracts' && count > 1
  // SSL-730: fixed pages of up to five offers. The strip used to re-centre on the selection, so a tapped tile jumped
  // to the middle and the others shuffled while the highlight seemed not to move. Tiles now hold their place; only
  // the highlight moves, and the page turns when the ‹ › counter steps past its edge.
  const windowSize = 5
  const windowStart = Math.floor(index / windowSize) * windowSize
  const offerWindow = visibleCards.slice(windowStart, windowStart + windowSize)
  const [view, setView] = useState<MapView>(() => {
    const site = requestedSite ? catalog.targets.find(target => target.id === requestedSite.targetId) : null
    return !site ? 'system' : moonParent(site.id) ? 'moons' : site.type === 'asteroid' ? 'belt' : site.orbit <= 4 ? 'inner' : 'outer'
  })
  const [moonParentId, setMoonParentId] = useState<string | null>(() => requestedSite ? moonParent(requestedSite.targetId) ?? null : null)
  const mineralSources = useMemo(() => sourceMineral
    ? catalog.targets.filter(t => t.type !== 'exoplanet' && t.minerals.includes(sourceMineral)).sort((a, b) => a.orbit - b.orbit)
    : [], [catalog.targets, sourceMineral])
  const [pickedId, setPickedId] = useState<string | null>(() => requestedSite?.targetId ?? (pendingMissionBoardTab() === 'program' ? 'earth' : null) ?? mineralSources[0]?.id ?? null)
  const [runId, setRunId] = useState<string | null>(() => tab === 'free' ? requestedSite?.runId ?? null : null)
  const [eventFocus, setEventFocus] = useState<string | null>(null)
  const picked = pickedId ? catalog.targets.find(t => t.id === pickedId) ?? null : null
  const locationName = pickedId === 'earth' ? 'Earth' : picked ? shortName(picked.name) : null
  const locationSteps = pickedId ? steps.filter(step => agencyStepLocation(step, catalog.missions) === pickedId) : []
  const locationCards = pickedId ? cards.filter(item => item.targetIds.includes(pickedId)) : []
  const agencyCards = locationCards.filter(item => !item.client && !locationSteps.some(step => step.id === item.mission.id))
  const clientCards = locationCards.filter(item => item.client)
  // A run tied to one body (a probe's targeted run) is offered only there.
  const pickedRuns = picked ? freeRuns.filter(run => (!run.targetId || run.targetId === picked.id) &&
    (sourceMineral
      ? sourceMineral in run.requires.minerals && picked.minerals.includes(sourceMineral)
      : Object.keys(run.requires.minerals).some(m => picked.minerals.includes(m)))
  ) : []
  const pickedRun = pickedRuns.find(run => run.id === runId) ?? pickedRuns[0] ?? null
  const contractTarget = contractTargetId ? catalog.targets.find(target => target.id === contractTargetId) ?? null : null
  const routeIds = card ? [card.mission.targetId, card.mission.deliveryTargetId].flatMap(id => id && catalog.targets.some(t => t.id === id) ? [id] : []) : []
  const candidateIds = card && routeIds.length === 0
    ? catalog.targets.filter(t => t.type !== 'exoplanet' && Object.keys(card.mission.requires.minerals).some(m => t.minerals.includes(m))).slice(0, 4).map(t => t.id)
    : []
  const mapMode: MapMode = tab === 'contracts' || tab === 'free' ? 'pick' : 'ambient'
  const visibleTargets = tab === 'contracts'
    ? catalog.targets.filter(target => cards.some(item => item.targetIds.includes(target.id)))
    : tab === 'free' && mineralSources.length > 0
      ? mineralSources
      : catalog.targets.filter(target => (target.type === 'planet' || target.type === 'asteroid') && !target.id.startsWith('earth-orbit-'))
  // A filtered moon still needs its parent on the map to remain reachable.
  const parentIds = new Set(visibleTargets.flatMap(target => moonParent(target.id) ?? []))
  const mapTargets = [...visibleTargets, ...catalog.targets.filter(target => parentIds.has(target.id) && !visibleTargets.some(visible => visible.id === target.id))]
  const sourceMineralName = sourceMineral ? catalog.minerals[sourceMineral]?.name ?? sourceMineral : null
  const selectedProgramStep = steps.find(step => step.id === programStepId)
    ?? steps.find(step => step.state === 'current')
    ?? steps[0]

  useEffect(() => clearMissionBoardTab(), [])

  // From the probe readout: open on the first contract its survey opened at that body.
  useEffect(() => {
    if (tab !== 'contracts' || !requestedSite) return
    const first = cards.find(item => item.mission.id.startsWith(`${PROBE_CONTRACT_PREFIX}${requestedSite.targetId}-`))
    if (first) onSelectMission(first.mission.id)
    // Only on open.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const first = mineralSources[0]
    if (!first) return
    const parentId = moonParent(first.id)
    setMoonParentId(parentId ?? null)
    setView(parentId ? 'moons' : first.type === 'asteroid' ? 'belt' : first.orbit <= 4 ? 'inner' : 'outer')
    // Only on open: the player may pan the map afterwards.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (tab !== 'contracts' || !card) return
    const destination = catalog.targets.find(target => target.id === card.mission.targetId)
    const candidatesAreAsteroids = candidateIds.length > 0 && candidateIds.every(id => catalog.targets.find(target => target.id === id)?.type === 'asteroid')
    if (destination?.type === 'asteroid' || candidatesAreAsteroids) return setView('belt')
    if (destination) return setView(destination.orbit <= 4 ? 'inner' : 'outer')
    setView('system')
  }, [candidateIds.join(','), card?.mission.id, catalog.targets, tab])

  const pickContractTarget = (id: string) => {
    const next = contractTargetId === id ? null : id
    setContractTargetId(next)
    if (!next) return
    const first = cards.find(item => item.targetIds.includes(next))
    if (first) onSelectMission(first.mission.id)
  }

  const pickContractGroup = (group: ContractGroup | null) => {
    setContractGroupFilter(group)
    const first = cards.find(item => (!group || contractGroup(item.mission) === group) && (!contractTargetId || item.targetIds.includes(contractTargetId)))
    if (first) onSelectMission(first.mission.id)
  }

  const selectVisibleRelative = (offset: number) => {
    if (!contractTargetId && !contractGroupFilter) return onSelectRelative(offset)
    if (visibleCards.length === 0) return
    const next = (index + offset + visibleCards.length) % visibleCards.length
    onSelectMission(visibleCards[next].mission.id)
  }

  const startStep = (step: ProgramStep) => {
    if (step.state === 'locked' || step.state === 'done') return
    onAccept(step.id, step.kind === 'focus' ? 'store' : undefined)
  }

  const openEvent = (event: SkyBoardCard) => {
    if (event.id === 'leonids-2026' || event.id === 'geminids-2026') {
      if (event.status === 'upcoming') return
    }
    // SSL-831: a chained shower (Leonids) starts its run directly, then opens its receiver.
    const chain = getShowerChain(event.id)
    if (chain) {
      if (chainNextScreen(player, chain) === 'radio-meteors') { onOpenEvent('radio-meteors'); return }
      const runId = getShower(chain.eventId)?.runMissionId
      if (runId && catalog.missions.some(mission => mission.id === runId)) { onAccept(runId); return }
    }
    if (event.id === 'orionids-2026' || event.id === 'draconids-2026' || event.id === 'leonids-2026' || event.id === 'geminids-2026') {
      // SSL-714: mission 2 (and listening on afterwards) happens on the community receiver, ORI-1.
      if (event.id === 'orionids-2026' && (player.orionidsEventStage ?? 0) >= 1) {
        onOpenEvent('radio-meteors')
        return
      }
      // Existing archive purchases and participation remain valid; new archive access is not yet migrated.
      if (event.id === 'orionids-2026' && event.status === 'ended' && !orionidsRunAvailable(player, orionidsNow)) {
        return
      }
      // Orionids is its own event chain, not a filter over ordinary Free Run
      // cargo. Accept the shower mission directly so a user cannot click the
      // event and accidentally start a generic hydrogen haul instead.
      if (event.id === 'orionids-2026' && player.orionidsEventStage === 0 && catalog.missions.some(mission => mission.id === ORIONIDS_NIGHT_RUN_ID)) {
        onAccept(ORIONIDS_NIGHT_RUN_ID)
        return
      }
      const target = catalog.targets.find(candidate => candidate.type === 'asteroid' && freeRuns.some(run =>
        Object.keys(run.requires.minerals).some(mineral => candidate.minerals.includes(mineral))))
      chooseTab('free')
      setView('belt')
      setEventFocus(event.name)
      setPickedId(target?.id ?? null)
      setRunId(null)
      return
    }
    if (event.id === 'saturn-night-2026') return onOpenEvent('saturn-storm-search')
    if (event.id === 'new-moon-hunt-2026-10') return onOpenEvent('asteroid-discovery')
    onOpenEvent('launchpad')
  }

  const signalColor = client?.color ?? 'var(--ln-board-amber)'
  const atlasEventLink = events.spacetober.links.find(link => link.href === ATLAS_ORIONIDS_CHECKIN.href)
  const chooseTab = (next: MissionBoardTab) => { rememberMissionBoardTab(next); setTab(next) }

  return <div className={styles.scene} data-testid="mission-setup-scaffold" data-screen="missions" data-paging={paging ? 'true' : 'false'} data-tab={tab} data-contract-target={contractTargetId ?? undefined}>
    <section className={styles.dispatch} style={{ '--signal': signalColor } as CSSProperties} data-testid="mission-board" aria-label="Mission board">
      <ScreenFrame surface="mission-setup" chrome="floating">
      <button type="button" className={styles.eventsCorner} data-testid="mission-board-tab-events" aria-label={tab === 'events' ? 'Return to solar system' : 'Events'} onClick={() => chooseTab(tab === 'events' ? 'free' : 'events')}>
        {tab === 'events' ? <ArrowIcon direction="left" /> : <StarIcon />}<span>{tab === 'events' ? 'Map' : 'Events'}</span>
        {tab !== 'events' && events.attention && <i className={styles.dot} data-testid="mission-board-events-dot" aria-label="Event live or upcoming" />}
      </button>
      <GalaxyMap targets={mapTargets} mode={mapMode} shipTargets={[...(player.activeMission && (player.missionRunId || player.missionPhase) ? [player.activeMission.target?.id ?? player.activeMission.mission?.targetId] : []), ...(player.pausedMissionRuns ?? []).map(run => run.targetId)].filter((id): id is string => !!id)} view={view} moonParentId={moonParentId} onOpenMoons={tab === 'free' ? id => { setMoonParentId(id); setView('moons') } : undefined} locationOpen={tab === 'free' && !!locationName} onView={next => { setView(next); if (tab === 'free') setPickedId(null) }} stops={tab === 'contracts' ? routeIds : []} candidates={tab === 'contracts' ? candidateIds : []}
        selectedId={tab === 'contracts' ? contractTargetId : tab === 'free' ? pickedId : null} onPick={id => {
          if (tab === 'contracts') pickContractTarget(id)
          else if (id === 'earth') onClose()
          else { setPickedId(id); setRunId(null) }
        }} />
      {tab === 'contracts' ? (card ? <>
        <article className={styles.contractWorkspace} aria-live="polite" data-testid="mission-board-section-client">
          <section className={styles.contractOffers} aria-label="Available contracts">
            <h2>Contracts</h2>
            <div className={styles.offerGroups} role="group" aria-label="Contract type" data-testid="mission-board-groups">
              <button type="button" data-active={!contractGroupFilter || undefined} aria-pressed={!contractGroupFilter} data-testid="mission-board-group-all" onClick={() => pickContractGroup(null)}>All<b>{siteCards.length}</b></button>
              {CONTRACT_GROUPS.map(group => {
                const groupCount = groupCounts.find(row => row.group === group)?.count ?? 0
                return (
                  <button key={group} type="button" disabled={!groupCount} data-group={group} data-active={contractGroupFilter === group || undefined} aria-pressed={contractGroupFilter === group} data-testid={`mission-board-group-${group}`} onClick={() => pickContractGroup(group)}>
                    <ContractGroupGlyph group={group} />{CONTRACT_GROUP_LABEL[group]}<b>{groupCount}</b>
                  </button>
                )
              })}
            </div>
            <div className={styles.offerStrip}>
              {offerWindow.map((offer, slot) => {
                const offerClient = offer.client
                return <button key={offer.mission.id} type="button" data-selected={offer.mission.id === card.mission.id || undefined}
                  aria-label={`Select ${offer.mission.title}`} onClick={() => onSelectMission(offer.mission.id)}>
                  <ClientMark initial={offerClient?.initial ?? 'OP'} color={offerClient?.color ?? 'var(--ln-board-amber)'} uiRole={offerClient?.uiRole ?? 'starter'} clientId={offerClient?.id} size={34} />
                  <span>{windowStart + slot + 1}</span>
                  <i className={styles.offerKind} data-group={contractGroup(offer.mission)} title={CONTRACT_GROUP_LABEL[contractGroup(offer.mission)]}><ContractGroupGlyph group={contractGroup(offer.mission)} /></i>
                </button>
              })}
              {Array.from({ length: windowSize - offerWindow.length }, (_, slot) => (
                <button key={slot} type="button" disabled hidden aria-hidden="true" className={styles.emptyOffer} />
              ))}
            </div>
          </section>
          <section className={styles.contractFocus}>
            <ClientMark initial={client?.initial ?? 'OP'} color={client?.color ?? 'var(--ln-board-amber)'} uiRole={client?.uiRole ?? 'starter'} clientId={client?.id} size={68} />
            <span>{client ? `${client.name} · L${clientLevel}` : 'Your program'}</span>
            <h2>{card.mission.title}</h2>
            {card.mission.brief && <p data-testid="mission-brief">{card.mission.brief}</p>}
            {!card.unlocked && card.lockedDetail && <p>{card.lockedDetail}</p>}
              <span className={styles.offerPager} data-testid="mission-board-pager">
                <button type="button" disabled={count < 2} aria-label="Previous contract" data-testid="mission-board-prev" onClick={() => selectVisibleRelative(-1)}>‹</button>
                <small>{index + 1} / {count}</small>
                <button type="button" disabled={count < 2} aria-label="Next contract" data-testid="mission-board-next" onClick={() => selectVisibleRelative(1)}>›</button>
              </span>

          </section>
          <section className={styles.contractAction}>
            <h2>Requirements</h2>
            <div className={styles.contractCargo} aria-label="Cargo">
              {Object.entries(card.mission.requires.minerals).map(([id, amount]) => {
                const meta = catalog.minerals[id]
                if (!meta) return null
                return <span key={id}><MineralRock shape={meta.shape} color={meta.color} /><b>{amount}</b><em>{meta.name}</em></span>
              })}
            </div>
            <strong className={styles.contractPay}><i aria-hidden="true">{FRANC}</i>{formatFrancs(card.displayPayout, { compact: true })}</strong>
            <button type="button" className={styles.contractTake} data-testid={`mission-accept-${card.mission.id}`} disabled={!card.unlocked || tutorialBlocked} onClick={() => onAccept(card.mission.id)}>ACCEPT</button>
          </section>
        </article>
      </> : <article className={styles.dock} data-testid="mission-board-section-client">
        {onboardingComplete ? <>
          <header className={styles.dockHead}><div className={styles.dockWho}><h2>No client signals yet</h2></div></header>
          <p className={styles.dockBrief}>{CONSTRUCTION_COMING_LATER ? 'Client missions open once the Earth storage silo is built. Building is coming later.' : 'Build the Earth storage silo to open client missions.'}</p>
          {!CONSTRUCTION_COMING_LATER && <div className={styles.dockDeal}><button type="button" className={styles.take} onClick={onOpenBuild}>BUILD STORAGE SILO</button></div>}
        </> : contractTargetId ? <>
          <header className={styles.dockHead}><div className={styles.dockWho}><span>Destination filter</span><h2>No contracts for this location</h2></div></header>
          <p className={styles.dockBrief}>Choose another body or tap the selected location again to show every contract.</p>
          <div className={styles.dockDeal}><button type="button" className={styles.clearFilter} data-testid="mission-destination-clear" onClick={() => setContractTargetId(null)}>SHOW ALL CONTRACTS</button></div>
        </> : <header className={styles.dockHead}><div className={styles.dockWho}><h2>No compatible client signals</h2></div></header>}
      </article>) : tab === 'free' ? <article className={locationName ? styles.locationPanel : `${styles.dock} ${styles.freeDock}`} data-testid="mission-board-solar">
        <header className={styles.dockHead}>{locationName && <div className={styles.locationWorld}><MapGlobe target={picked ?? undefined} /></div>}<div className={styles.dockWho}>
          <span>{locationName ? 'Location missions' : 'Solar system'}</span><h2>{locationName ?? 'Choose a location'}</h2>
        </div>{locationName && <button type="button" className={styles.clearFilter} aria-label="Close location missions" onClick={() => setPickedId(null)}>Close</button>}</header>
        {!locationName && <p className={styles.dockBrief}>Select a planet to see its missions and moons, or open the asteroid belt.</p>}
        {sourceMineralName && <p className={styles.dockBrief}>Showing locations with {sourceMineralName}. <button type="button" onClick={() => setSourceMineral(null)}>Show all locations</button></p>}
        {locationName && <div className={styles.locationMissions}>
          <section aria-label="Agency missions" data-testid="location-agency-missions">
            <h3>Agency missions</h3>
            {locationSteps.length === 0 && agencyCards.length === 0 && pickedRuns.length === 0 && <p>No agency missions available here yet.</p>}
            {locationSteps.map(step => { const mission = catalog.missions.find(item => item.id === step.id); return <article className={styles.locationMission} key={step.id}>
              {mission ? <><span className={styles.locationIcon} data-kind={contractGroup(mission)}><MissionGlyph mission={mission} /></span><div><strong>{step.title}</strong><small>{STEP_STATE_LABEL[step.state]}</small><MissionAtAGlance mission={mission} /></div></> : <ProgramStepFallback step={step} />}
              <button type="button" disabled={step.state === 'locked' || step.state === 'done' || tutorialBlocked} onClick={() => startStep(step)}>{step.state === 'locked' ? 'Locked' : step.state === 'done' ? 'Done' : 'Select'}</button>
              <details><summary>Mission details</summary><p>{step.brief}</p><p>{step.state === 'locked' ? step.lockLine : step.detail}</p></details>
            </article> })}
            {pickedRuns.map(run => <article className={styles.locationMission} key={run.id} data-testid={`location-run-${run.id}`}>
              <span className={styles.locationIcon} data-kind={contractGroup(run)}><MissionGlyph mission={run} /></span><div><strong>{run.title}</strong><MissionAtAGlance mission={run} /></div>
              <button type="button" disabled={tutorialBlocked} data-testid={`location-accept-${run.id}`} onClick={() => { onAccept(run.id); if (pickedId) onPickTarget?.(pickedId) }}>Select</button>
              <details><summary>Mission details</summary><p>{run.brief}</p></details>
            </article>)}
            {agencyCards.map(item => <article className={styles.locationMission} key={item.mission.id}>
              <span className={styles.locationIcon} data-kind={contractGroup(item.mission)}><MissionGlyph mission={item.mission} /></span><div><strong>{item.mission.title}</strong><MissionAtAGlance mission={item.mission} /></div>
              <button type="button" disabled={!item.unlocked || tutorialBlocked} onClick={() => { onAccept(item.mission.id); if (pickedId) onPickTarget?.(pickedId) }}>Select</button>
              <details><summary>Mission details</summary><p>{item.mission.brief}</p>{!item.unlocked && <p>{item.lockedDetail}</p>}</details>
            </article>)}
          </section>
          <section aria-label="Client missions" data-testid="location-client-missions">
            <h3>Client missions</h3>
            {clientCards.length === 0 && <p>No client missions available here right now.</p>}
            {clientCards.length === 0 && onboardingComplete && !CONSTRUCTION_COMING_LATER && <button type="button" className={styles.clearFilter} onClick={onOpenBuild}>Build storage silo to open client missions</button>}
            {clientCards.map(item => <article className={styles.locationMission} key={item.mission.id}>
              <span className={styles.locationIcon} data-kind={contractGroup(item.mission)}><MissionGlyph mission={item.mission} /></span><div><strong>{item.mission.title}</strong><small>{item.client?.name} · {formatCurrency(item.displayPayout, { compact: true })}</small><MissionAtAGlance mission={item.mission} /></div>
              <button type="button" disabled={!item.unlocked || tutorialBlocked} data-testid={`location-accept-${item.mission.id}`} onClick={() => { onAccept(item.mission.id); if (pickedId) onPickTarget?.(pickedId) }}>Select</button>
              <details><summary>Mission details</summary><p>{item.mission.brief}</p>{!item.unlocked && <p>{item.lockedDetail}</p>}{Object.entries(item.mission.requires.minerals).length > 0 && <p>Requires: {Object.entries(item.mission.requires.minerals).map(([id, amount]) => `${amount} ${catalog.minerals[id]?.name ?? id}`).join(', ')}</p>}</details>
            </article>)}
          </section>
          <section aria-label="Construction and sandbox"><h3>Construction &amp; sandbox</h3><p>Coming later.</p></section>
        </div>}
      </article> : <div className={`${styles.sheet} ${tab === 'events' ? styles.eventSheet : ''}`}>
          {tab === 'program' && <div className={styles.chain} data-testid="mission-board-program">
            <header className={styles.chainHead} data-testid="program-summary">
              <div>
                <h2>Agency missions</h2>
                <p>{fleet.owned.reduce((sum, craft) => sum + craft.owned, 0)} craft · {fleet.dataPerDay} items/day · {fleet.contributed} project contributions</p>
              </div>

            </header>
            <div className={styles.skillTree} role="list" aria-label="Agency mission progress">
              {steps.map((step, stepIndex) => <button key={step.id} type="button" role="listitem" className={styles.skillNode}
                data-state={step.state} data-selected={step.id === selectedProgramStep?.id || undefined}
                data-testid={`program-step-${step.id}`} aria-pressed={step.id === selectedProgramStep?.id}
                onClick={() => setProgramStepId(step.id)}>
                <span className={styles.skillIndex} aria-hidden="true">{step.state === 'done' ? <CheckIcon /> : stepIndex + 1}</span>
                <span className={styles.skillGlyph} aria-hidden="true"><StepGlyph kind={step.kind} /></span>
                <span className={styles.skillCopy}>
                  <span>{STEP_KIND_LABEL[step.kind]} · {STEP_STATE_LABEL[step.state]}</span>
                  <strong>{step.title}</strong>
                </span>
              </button>)}
            </div>
            {selectedProgramStep && <article className={styles.skillDetail} data-state={selectedProgramStep.state} data-testid="program-step-detail">
              <header>
                <span className={styles.glyph} aria-hidden="true"><StepGlyph kind={selectedProgramStep.kind} /></span>
                <div><span className={styles.kicker}>{STEP_KIND_LABEL[selectedProgramStep.kind]} · {STEP_STATE_LABEL[selectedProgramStep.state]}</span><h3>{selectedProgramStep.title}</h3></div>
              </header>
              {selectedProgramStep.brief && <p className={styles.skillBrief}>{selectedProgramStep.brief}</p>}
              <p className={styles.reward}><b>Unlocks</b> {selectedProgramStep.detail}</p>
              {selectedProgramStep.state === 'locked' && selectedProgramStep.lockLine && <div className={styles.gate}>
                <span><LockIcon /> Needs: {selectedProgramStep.lockLine}</span>
                {selectedProgramStep.progress && <span className={styles.gateMeter}><i style={{ width: `${(selectedProgramStep.progress.have / selectedProgramStep.progress.need) * 100}%` }} /><em>{selectedProgramStep.progress.label} {selectedProgramStep.progress.have}/{selectedProgramStep.progress.need}</em></span>}
              </div>}
              {(selectedProgramStep.state === 'current' || selectedProgramStep.state === 'available') && <button type="button" className={styles.start} data-testid={`program-start-${selectedProgramStep.id}`} onClick={() => startStep(selectedProgramStep)}>{selectedProgramStep.state === 'current' ? 'START' : 'ACCEPT'}</button>}
            </article>}
          </div>}

          {tab === 'events' && <div className={styles.events} data-testid="mission-board-events">
            <nav className={styles.eventList} aria-label="Choose an event">
              {events.groups.map(group => <section key={group.status} aria-label={group.title} data-testid={`events-group-${group.status}`}>
                <h3>{group.title}</h3>
                {group.cards.map(item => <button type="button" key={item.id} aria-pressed={item.id === event?.id} data-testid={`event-select-${item.id}`} onClick={() => setFocusedEventId(item.id)}>
                  <strong>{item.name}</strong><small>{item.earnedTier ? `${item.earnedTier} badge earned` : item.status === 'live' ? 'Live now' : item.status === 'upcoming' ? 'Coming soon' : 'Replay & rewards'}</small>
                </button>)}
              </section>)}
            </nav>
            <div className={styles.eventDetail} aria-live="polite">
            {event && <article key={event.id} className={styles.eventCard} data-event-focused="true" data-testid={event.id === 'orionids-2026' ? 'events-orionids' : `events-card-${event.id}`}>
                  <div className={styles.eventArt} aria-hidden="true"><SkyBanner kind={bannerKind(event.id)} /></div>
                  <div className={styles.eventBody}>
                    <div className={styles.eventTitle}><h3>{event.name}</h3><EventStatus card={event} /></div>
                    <p className={styles.eventReward}>{event.rewardLabel}</p>
                    {event.steps && <>
                      <p className={styles.eventBlurb} data-testid={`event-blurb-${event.id}`}>{event.blurb}</p>
                      <ol className={styles.eventSteps} data-testid={`event-steps-${event.id}`}>
                        {event.steps.map(step => <li key={step.label} data-state={step.state}>{step.label}</li>)}
                      </ol>
                    </>}
                    <EventSpecials eventId={event.id} player={player} onStart={special => {
                      const target = catalog.targets.find(t => t.id === special.targetId)
                      if (target) { onAccept(special.id); onPickTarget?.(target.id) }
                    }} />
                    {event.id === 'orionids-2026' && <p className={styles.eventReward} data-testid="orionids-local-window">{localOrionids.location.city ?? localOrionids.location.timeZone}: best {formatViewingWindow(localOrionids.best, localOrionids.location.timeZone)} · moon-free {formatViewingWindow(localOrionids.moonFree, localOrionids.location.timeZone)}</p>}
                    <button type="button" disabled={event.status === 'upcoming' || (event.id === 'orionids-2026' && event.status === 'ended' && !orionidsRunAvailable(player, orionidsNow))} className={styles.eventAction} data-testid={`event-action-${event.id}`} onClick={() => openEvent(event)}>{event.status === 'upcoming' ? 'Opens soon' : event.actionLabel}</button>
                  </div>
                </article>}
            {event?.id === 'orionids-2026' && (isOrionidsWindow(orionidsNow) || orionidsArchiveUnlocked(player) || heldFragments(player.stash) > 0 || (player.orionidsFragments?.caught ?? 0) > 0) && (
              <details className={styles.fragmentBench} data-testid="orionids-fragments"><summary>Fragment rewards</summary>
                <p>HELD {heldFragments(player.stash)} · CAUGHT {player.orionidsFragments?.caught ?? 0} · REDEEMED {player.orionidsFragments?.redeemed ?? 0}</p>
                {player.badges?.['orionids-looked-up'] && <p data-testid="orionids-looked-up">LOOKED UP · {player.badges['orionids-looked-up'].tier.toUpperCase()}</p>}
                <p data-testid="orionids-fireball-progress">FIREBALL {heldFragments(player.stash)} / {FRAGMENTS_PER_FIREBALL}</p>
                <div className={styles.fragmentActions}>
                  <button type="button" className={styles.eventAction} data-testid="orionids-redeem" disabled={heldFragments(player.stash) < FRAGMENT_REDEEM_BATCH} onClick={onRedeemFragments}>REDEEM {FRAGMENT_REDEEM_BATCH}</button>
                  {heldFragments(player.stash) >= FRAGMENTS_PER_FIREBALL && (
                    <button type="button" className={styles.eventAction} data-testid="orionids-combine" onClick={onCombineFragments}>MAKE FIREBALL</button>
                  )}
                </div>
              </details>
            )}
            {event?.id === 'orionids-2026' && atlasEventLink && <a className={styles.eventAtlas} href={atlasEventLink.href} target="_blank" rel="noreferrer">{atlasEventLink.label}</a>}
            </div>
          </div>}
      </div>}
      </ScreenFrame>
    </section>
  </div>
}
