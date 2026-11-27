'use client'


import { useEffect, useMemo, useState, type CSSProperties } from 'react'
import { formatCurrency } from '@/lib/format'
import type { Catalog } from '@/lib/catalog'
import type { Player } from '@/lib/game-types'
import type { MissionRelayCardModel } from '@/lib/hooks/useMissionRelayModels'
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
import { ORIONIDS_NIGHT_RUN_ID } from '@/lib/data/missions'
import { getShower, } from '@/lib/data/showers'
import { masteryBonus, showerSpecials, type SpecialView } from '@/lib/orionids/special-missions'
import { chainNextScreen, getShowerChain } from '@/lib/orionids/chain'
import { FRAGMENT_REDEEM_BATCH, FRAGMENTS_PER_FIREBALL, heldFragments } from '@/lib/orionids/fragments'
import {
  eventsBoard,
  programChain,
  type ProgramStep,
  type SkyBoardCard,
} from '@/lib/mission-board-view'
import { clearMissionBoardTab, lastMissionBoardTab, rememberMissionBoardTab, pendingMissionBoardEvent, pendingMissionBoardMineral, pendingMissionBoardSite, pendingMissionBoardTab, type MissionBoardTab } from '@/lib/mission-board-nav'
import { contractGroup, type ContractGroup } from '@/lib/contract-groups'
import { orionidsArchiveUnlocked, orionidsRunAvailable } from '@/lib/orionids/access'
import ScreenFrame from '@/components/layout/frame/ScreenFrame'
import styles from './MissionBoard.module.css'
import { formatViewingWindow, localSkyEventWindow, ORIONIDS_EPHEMERIS } from '@/lib/data/sky-event-window'
import SolarOrbitGlobe from './screens/SolarOrbitGlobe'
import MapPlanet3D from './screens/MapPlanet3D'
import { terrainLookForTarget } from '@/lib/takeon/terrainColour'
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

function StarIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 3 2.2 6.4H21l-5.4 4 2 6.6L12 16.8 6.4 20l2-6.6L3 9.4h6.8L12 3z" /></svg>
}

const STEP_KIND_LABEL: Record<ProgramStep['kind'], string> = { instrument: 'Instrument', mining: 'Mining', focus: 'Focus' }
const STEP_STATE_LABEL: Record<ProgramStep['state'], string> = { done: 'Done', current: 'Next up', available: 'Open', locked: 'Locked' }

function StepGlyph({ kind }: { kind: ProgramStep['kind'] }) {
  if (kind === 'mining' || kind === 'focus') return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 18h16M8 18l2-8h4l2 8M10 10V7h4v3" /></svg>
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 16c3-1 5-5 8-12 3 7 5 11 8 12" /><circle cx="12" cy="16" r="2" /><path d="M8 20h8" /></svg>
}

type Target = Catalog['targets'][number]
type MapView = 'system' | 'inner' | 'belt' | 'outer' | 'moons'
type MapMode = 'route' | 'pick' | 'ambient'

// The system is Sun-centred and in orbital order, with deliberately compressed
// spacing and illustrative positions (not real-time ephemerides).
const SUN = { x: 50, y: 46 }
const ORBITS = [7, 12, 17, 22, 29, 35, 41, 47] as const
const orbitPosition = (radius: number, angle: number) => ({ x: SUN.x + radius * Math.cos(angle), y: SUN.y + radius * .46 * Math.sin(angle) })
const EARTH_POS = orbitPosition(ORBITS[2], -.55)
const SYSTEM_POSITIONS: Record<string, { x: number; y: number }> = {
  mercury: orbitPosition(ORBITS[0], 2.5), venus: orbitPosition(ORBITS[1], -1.7), mars: orbitPosition(ORBITS[3], 1.7),
  jupiter: orbitPosition(ORBITS[4], -2.4), saturn: orbitPosition(ORBITS[5], -.35), uranus: orbitPosition(ORBITS[6], 2.45), neptune: orbitPosition(ORBITS[7], .85),
}
const BELT_POS = orbitPosition(25.5, .9)
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
  return Array.from({ length: 70 }, () => ({
    x: rand() * 100, y: rand() * 100, size: 0.8 + rand() * 1.5, glow: 0.2 + rand() * 0.6,
    tint: STAR_TINTS[Math.floor(rand() * STAR_TINTS.length)],
  }))
})()

const REGION_EARTH_POS = { x: 38, y: 42 }
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
  const [meshReady, setMeshReady] = useState(false)
  useEffect(() => setMeshReady(false), [target?.id])
  const gasColours: Record<string, readonly [string, string, string]> = { jupiter: ['#d6b79a', '#b77c60', '#f0dcc4'], saturn: ['#e1cb9f', '#b59b70', '#f1e4bd'], uranus: ['#8bd5d6', '#5dabb6', '#c0e8e3'], neptune: ['#427cce', '#28529c', '#8bb8ef'] }
  const colours = target ? gasColours[target.id] ?? terrainLookForTarget(target).ground : ['#4c9172', '#326d9f', '#b6d5ce']
  return <i className={styles.gxPlanet} data-planet={target?.id ?? 'earth'} style={{ background: `radial-gradient(circle at 30% 25%, ${colours[2]}, ${colours[0]} 45%, ${colours[1]} 72%, #101a29 100%)` }}>
    {!meshReady && <SolarOrbitGlobe targetId={target?.id ?? 'earth'} colours={colours} scale={1} opacity={1} landable={target?.archetype !== 'gas-giant'} mapIcon onReady={ignoreGlobeReady} />}
    <MapPlanet3D targetId={target?.id ?? 'earth'} colours={colours} onReady={setMeshReady} />
    <b className={styles.gxPlanetLight} aria-hidden="true" />
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
  const anchor = BELT_POS
  const planetPos = (t: Target) => SYSTEM_POSITIONS[t.id] ?? { x: 48 + spread(t.id) * 30, y: 48 + spread(`${t.id}y`) * 25 }
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
        {ORBITS.map(radius => <ellipse key={radius} cx={SUN.x} cy={SUN.y} rx={radius} ry={radius * .46} className={styles.gxSystemOrbit} />)}
        <ellipse cx={SUN.x} cy={SUN.y} rx="25.5" ry={25.5 * .46} className={styles.gxBeltOrbit} />
        {mode === 'pick' && shipTargets.map((id, index) => {
          const target = real.find(body => body.id === id)
          if (!target) return null
          const destination = pos(target)
          const parentId = moonParent(target.id)
          const uprightPositions: Record<string, { x: number; y: number }> = {
            mercury: { x: 25, y: 20 }, venus: { x: 62, y: 20 }, mars: { x: 62, y: 34 },
            jupiter: { x: 62, y: 49 }, saturn: { x: 22, y: 62 }, uranus: { x: 62, y: 62 }, neptune: { x: 35, y: 75 },
          }
          const uprightDestination = target.type === 'asteroid' ? { x: 25, y: 49 } : uprightPositions[parentId ?? target.id] ?? { x: 22, y: 34 }
          const ship = (path: string, className: string) => <g className={`${styles.gxShip} ${className}`} aria-label={`Ship toward ${target.name}`}>
            <path d="M-1.1,-0.65 L1.4,0 L-1.1,0.65 L-0.6,0 Z" />
            <animateMotion dur={`${14 + index * 3}s`} repeatCount="indefinite" rotate="auto" path={path} />
          </g>
          return <g key={`${id}-${index}`}>
            {ship(line([EARTH_POS, destination]), styles.gxShipWide)}
            {ship(line([{ x: 22, y: 34 }, uprightDestination]), styles.gxShipPortrait)}
          </g>
        })}
        {mode !== 'ambient' && route.length > 1 && (stops.length > 0
          ? <path d={line(route)} className={styles.gxRoute} />
          : route.slice(1).map((p, i) => <path key={i} d={line([route[0], p])} className={styles.gxSpoke} />))}
      </svg>
      <i className={styles.gxSun} style={style(SUN)} />
      {mode !== 'ambient' && <>
        {earth(EARTH_POS)}
        {shownPlanets.map(t => node(t, planetPos(t), t.name))}
        <button type="button" className={styles.gxBelt} data-lit={litAsteroid ? true : undefined} style={style(anchor)} data-testid="map-belt" onClick={() => onView('belt')}>
          <i /><span>Asteroid belt<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6" /><path d="m15 15 5 5M10.5 8v5M8 10.5h5" /></svg></span>
        </button>
      </>}
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
  catalog, player, cards, onAccept, onClose, onOpenEvent, onPickTarget,
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
  const steps = useMemo(() => programChain(catalog, player, now).filter(step => step.kind !== 'mining' && step.kind !== 'focus'), [catalog, player, now])
  const events = useMemo(
    () => eventsBoard(now, player.badges, orionidsNow, player.orionidsFinds, player.meteoriteMastery ?? 0, player.orionidsEventStage ?? 0, orionidsRunAvailable(player, orionidsNow), player),
    [now, orionidsNow, player.badges, player.meteoriteMastery, player.orionidsEventStage, player.orionidsFinds, player.orionidsFragments, player.researchPurchases],
  )
  const eventCards = events.groups.flatMap(group => group.cards)
  const event = eventCards.find(item => item.id === focusedEventId) ?? eventCards[0]
  const freeRuns = useMemo(() => catalog.missions.filter(m => m.id.startsWith('self-directed-') && !m.locked), [catalog.missions])
  const [view, setView] = useState<MapView>(() => {
    const site = requestedSite ? catalog.targets.find(target => target.id === requestedSite.targetId) : null
    return !site ? 'system' : moonParent(site.id) ? 'moons' : site.type === 'asteroid' ? 'belt' : site.orbit <= 4 ? 'inner' : 'outer'
  })
  const [moonParentId, setMoonParentId] = useState<string | null>(() => requestedSite ? moonParent(requestedSite.targetId) ?? null : null)
  const mineralSources = useMemo(() => sourceMineral
    ? catalog.targets.filter(t => t.type !== 'exoplanet' && t.minerals.includes(sourceMineral)).sort((a, b) => a.orbit - b.orbit)
    : [], [catalog.targets, sourceMineral])
  const [pickedId, setPickedId] = useState<string | null>(() => requestedSite?.targetId ?? (pendingMissionBoardTab() === 'program' ? 'earth' : null) ?? mineralSources[0]?.id ?? null)
  const [, setRunId] = useState<string | null>(null)
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
  const mapMode: MapMode = tab === 'free' ? 'pick' : 'ambient'
  const visibleTargets = tab === 'free' && mineralSources.length > 0
    ? mineralSources
    : catalog.targets.filter(target => (target.type === 'planet' || target.type === 'asteroid') && !target.id.startsWith('earth-orbit-'))
  // A filtered moon still needs its parent on the map to remain reachable.
  const parentIds = new Set(visibleTargets.flatMap(target => moonParent(target.id) ?? []))
  const mapTargets = [...visibleTargets, ...catalog.targets.filter(target => parentIds.has(target.id) && !visibleTargets.some(visible => visible.id === target.id))]
  const sourceMineralName = sourceMineral ? catalog.minerals[sourceMineral]?.name ?? sourceMineral : null

  useEffect(() => clearMissionBoardTab(), [])

  useEffect(() => {
    const first = mineralSources[0]
    if (!first) return
    const parentId = moonParent(first.id)
    setMoonParentId(parentId ?? null)
    setView(parentId ? 'moons' : first.type === 'asteroid' ? 'belt' : first.orbit <= 4 ? 'inner' : 'outer')
    // Only on open: the player may pan the map afterwards.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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
            setPickedId(target?.id ?? null)
      setRunId(null)
      return
    }
    if (event.id === 'saturn-night-2026') return onOpenEvent('saturn-storm-search')
    if (event.id === 'new-moon-hunt-2026-10') return onOpenEvent('asteroid-discovery')
    onOpenEvent('launchpad')
  }

  const signalColor = 'var(--ln-board-amber)'
  const atlasEventLink = events.spacetober.links.find(link => link.href === ATLAS_ORIONIDS_CHECKIN.href)
  const chooseTab = (next: MissionBoardTab) => { rememberMissionBoardTab(next); setTab(next) }

  return <div className={styles.scene} data-testid="mission-setup-scaffold" data-screen="missions" data-tab={tab}>
    <section className={styles.dispatch} style={{ '--signal': signalColor } as CSSProperties} data-testid="mission-board" aria-label="Mission board">
      <ScreenFrame surface="mission-setup" chrome="floating">
      <button type="button" className={styles.eventsCorner} data-testid="mission-board-tab-events" aria-label={tab === 'events' ? 'Return to solar system' : 'Events'} onClick={() => chooseTab(tab === 'events' ? 'free' : 'events')}>
        {tab === 'events' ? <ArrowIcon direction="left" /> : <StarIcon />}<span>{tab === 'events' ? 'Map' : 'Events'}</span>
        {tab !== 'events' && events.attention && <i className={styles.dot} data-testid="mission-board-events-dot" aria-label="Event live or upcoming" />}
      </button>
      <GalaxyMap targets={mapTargets} mode={mapMode} shipTargets={[...(player.activeMission && (player.missionRunId || player.missionPhase) ? [player.activeMission.target?.id ?? player.activeMission.mission?.targetId] : []), ...(player.pausedMissionRuns ?? []).map(run => run.targetId)].filter((id): id is string => !!id)} view={view} moonParentId={moonParentId} onOpenMoons={tab === 'free' ? id => { setMoonParentId(id); setView('moons') } : undefined} locationOpen={tab === 'free' && !!locationName} onView={next => { setView(next); if (tab === 'free') setPickedId(null) }}
        selectedId={tab === 'free' ? pickedId : null} onPick={id => {
          if (id === 'earth') onClose()
          else { setPickedId(id); setRunId(null) }
        }} />
      {tab === 'free' ? <article className={locationName ? styles.locationPanel : `${styles.dock} ${styles.freeDock}`} data-testid="mission-board-solar">
        <header className={styles.dockHead}>{locationName && <div className={styles.locationWorld}><MapGlobe target={picked ?? undefined} /></div>}<div className={styles.dockWho}>
          <span>{locationName ? 'Location missions' : 'Solar system'}</span><h2>{locationName ?? 'Choose a location'}</h2>
        </div>{locationName && <button type="button" className={styles.clearFilter} aria-label="Close location missions" onClick={() => setPickedId(null)}>Close</button>}</header>
        {!locationName && <><p className={styles.dockBrief}>Select a world to see its missions and moons. Map positions are schematic.</p>
          <p className={styles.agencyOverview} data-testid="map-agency-overview"><strong>Your agency</strong><span>{player.activeMission ? `Active: ${player.activeMission.mission?.title ?? player.activeMission.target?.name ?? 'Mission underway'}` : 'No active mission'} · {player.missionsDone} completed{(player.pausedMissionRuns?.length ?? 0) > 0 ? ` · ${player.pausedMissionRuns!.length} paused` : ''}</span></p></>}
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
            {clientCards.map(item => <article className={styles.locationMission} key={item.mission.id}>
              <span className={styles.locationIcon} data-kind={contractGroup(item.mission)}><MissionGlyph mission={item.mission} /></span><div><strong>{item.mission.title}</strong><small>{item.client?.name} · {formatCurrency(item.displayPayout, { compact: true })}</small><MissionAtAGlance mission={item.mission} /></div>
              <button type="button" disabled={!item.unlocked || tutorialBlocked} data-testid={`location-accept-${item.mission.id}`} onClick={() => { onAccept(item.mission.id); if (pickedId) onPickTarget?.(pickedId) }}>Select</button>
              <details><summary>Mission details</summary><p>{item.mission.brief}</p>{!item.unlocked && <p>{item.lockedDetail}</p>}{Object.entries(item.mission.requires.minerals).length > 0 && <p>Requires: {Object.entries(item.mission.requires.minerals).map(([id, amount]) => `${amount} ${catalog.minerals[id]?.name ?? id}`).join(', ')}</p>}</details>
            </article>)}
          </section>
          <section aria-label="Construction and sandbox"><h3>Construction &amp; sandbox</h3><p>Coming later.</p></section>
        </div>}
      </article> : <div className={`${styles.sheet} ${tab === 'events' ? styles.eventSheet : ''}`}>
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
