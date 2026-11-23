// The one view Minimal has: side-on, sky above, ground below (Liam, 2026-11-23:
// one consistent perspective, all about progression and next steps). Home is
// the agency's base drawn from Landnam's base-site map; a destination is the
// same frame dressed in that world's colours, with its ore in the ground.
// The rocket is the only thing that travels between them.
import { useEffect, useState, type ReactNode } from 'react'
import { BASE_SITE, GROUND, backdropFor, skyGrade, spriteCenterOffset, structureSprite } from '@landnam/lib/scene/base-site'
import { terrainLookForTarget } from '@landnam/lib/takeon/terrainColour'
import { MINERAL_META } from '@landnam/lib/data/minerals'
import type { Target } from '@landnam/lib/data/types'
import type { Base, StructureId } from './structures'

const ASSETS = '/game/assets/'
const KIT = `${ASSETS}base/kit/`
/** Left to right, as on Landnam's base. */
export const ORDER: StructureId[] = ['hangar', 'launchpad', 'control-station', 'exchange']
const KIND: Record<StructureId, string> = { hangar: 'hangar', launchpad: 'launchpad', 'control-station': 'control-station', exchange: 'market' }
const GAP = 4

export type Rocket = 'parked' | 'launching' | 'landing' | 'away'

export function useView() {
  const read = () => ({ w: window.innerWidth, h: window.innerHeight })
  const [view, setView] = useState(read)
  useEffect(() => {
    const on = () => setView(read())
    window.addEventListener('resize', on)
    return () => window.removeEventListener('resize', on)
  }, [])
  return view
}

/** Where the ground line sits: the same at home and away, so the frame never jumps. */
export function groundLine(h: number): number {
  return Math.round(Math.max(h * 0.42, Math.min(h * 0.62, h - 280)))
}

function grade(): keyof typeof BASE_SITE.sky.grades {
  const h = new Date().getHours()
  return h < 5 ? 'night' : h < 7 ? 'dawn' : h < 11 ? 'morning' : h < 14 ? 'midday' : h < 17 ? 'afternoon' : h < 20 ? 'dusk' : 'night'
}

/** Each structure's sprite and centre for this screen: the whole base fits the width, no scrolling. */
function baseLayout(w: number, ground: number, base: Base) {
  const sprites = ORDER.map(id => {
    const level = base.structures.find(s => s.def.id === id)!.level
    return { id, sprite: structureSprite(KIND[id], level)! }
  })
  // Spaced by each building's body, not its sprite box: the boxes carry empty margins.
  const body = (s: (typeof sprites)[number]) => s.sprite.body ?? s.sprite.width!
  const span = sprites.reduce((n, s) => n + body(s), 0) + GAP * (ORDER.length - 1)
  const px = Math.min(2.4, (w - 16) / span, (ground - 90) / 116)
  let x = (w - span * px) / 2
  return {
    px,
    items: sprites.map(s => {
      const cx = x + (body(s) * px) / 2
      x += (body(s) + GAP) * px
      return { ...s, cx }
    }),
  }
}

export function Home({ base, rocket, fresh, event, children }: {
  base: Base
  rocket: Rocket
  /** Structures that just levelled up glow once. */
  fresh: ReadonlySet<StructureId>
  /** A sky event is on: streaks cross the sky. */
  event?: boolean
  children?: ReactNode
}) {
  const { w, h } = useView()
  const ground = groundLine(h)
  const { px, items } = baseLayout(w, ground, base)
  const sky = skyGrade(grade())
  const plain = backdropFor('mountains')[0]
  const pad = items.find(i => i.id === 'launchpad')!
  const mount = pad.sprite.mount ?? { x: 60, z: 15 }
  const padLeft = pad.cx - (pad.sprite.width! * px) / 2 + spriteCenterOffset(pad.sprite) * px
  return (
    <div className="st" style={{ '--ground': `${ground}px`, '--px': `${px}px`, '--sky-top': sky.top, '--sky-mid': sky.mid, '--sky-horizon': sky.horizon } as React.CSSProperties}>
      <div className="st-sky st-sky-home" />
      {event && <Streaks />}
      {plain && <div className="st-band" style={{ backgroundImage: `url(${ASSETS}${plain.src})`, bottom: `calc(100% - var(--ground) + ${plain.bottom} * var(--px))`, height: `calc(${plain.height} * var(--px))` }} />}
      <div className="st-band" style={{ backgroundImage: `url(${ASSETS}${GROUND.src})`, top: `calc(var(--ground) - ${GROUND.above} * var(--px))`, height: `calc(${GROUND.above + GROUND.below} * var(--px))` }} />
      <div className="st-deep" style={{ top: `calc(var(--ground) + ${GROUND.below - 1} * var(--px))`, background: GROUND.deep }} />
      {items.map(({ id, sprite, cx }) => {
        const level = base.structures.find(s => s.def.id === id)!.level
        return (
          <img
            key={id}
            className={`st-structure${fresh.has(id) ? ' st-fresh' : ''}`}
            src={`${ASSETS}${sprite.src}`}
            alt=""
            draggable={false}
            data-level={level}
            style={{
              left: cx - (sprite.width! * px) / 2 + spriteCenterOffset(sprite) * px,
              width: sprite.width! * px,
              height: sprite.height! * px,
              bottom: `calc(100% - var(--ground) + ${sprite.foot ?? 0} * var(--px))`,
            }}
          />
        )
      })}
      {rocket !== 'away' && (
        <div
          className={`st-rocket st-rocket-${rocket}`}
          style={{ left: padLeft + mount.x * px - 22 * px * 0.7, width: 44 * px * 0.7, bottom: `calc(100% - var(--ground) + ${mount.z} * var(--px))` }}
        >
          <img src={`${KIT}pad-rocket.png`} alt="" draggable={false} />
          {rocket !== 'parked' && <img className="st-flame" src={`${KIT}flame-0.png`} alt="" draggable={false} />}
        </div>
      )}
      {children}
    </div>
  )
}

export interface Deposit {
  key: number
  mineral: string
  /** Column and row in the ground. */
  col: number
  row: number
  cut: boolean
  /** The laser is not strong enough yet. */
  locked: boolean
}

export function Away({ target, rocket, deposits = [], beam, payload, raising, crates, event, onCut }: {
  target: Target
  rocket: 'arriving' | 'hover' | 'leaving'
  deposits?: Deposit[]
  /** The deposit the laser is on right now. */
  beam?: number
  /** A satellite or probe is let go and climbs out of frame. */
  payload?: 'satellite' | 'probe'
  /** A structure rising on site (0 to 1, build runs). */
  raising?: number
  /** Cargo dropped at a delivery stop. */
  crates?: boolean
  event?: boolean
  onCut?: (key: number) => void
}) {
  const { w, h } = useView()
  const ground = groundLine(h)
  const look = terrainLookForTarget(target as Parameters<typeof terrainLookForTarget>[0])
  const airless = look.atmosphere === 'none'
  const cols = Math.max(3, Math.min(6, Math.floor((Math.min(w, 640) - 24) / 72)))
  const lane = Math.min(w, 640)
  const left0 = (w - lane) / 2
  const colX = (c: number) => left0 + ((c + 0.5) * lane) / cols
  const rowY = (r: number) => ground + 44 + r * 84
  const rocketX = w / 2
  const rocketY = ground - Math.min(190, ground * 0.5)
  const target2 = deposits.find(d => d.key === beam)
  return (
    <div className="st" style={{ '--ground': `${ground}px`, '--sky-top': airless ? '#03040a' : look.skyNight, '--sky-mid': airless ? '#0a0d18' : look.sky, '--sky-horizon': airless ? '#1a1e2c' : look.ground[0] } as React.CSSProperties}>
      <div className="st-sky" />
      {airless && <div className="st-stars" />}
      {event && <Streaks />}
      <svg className="st-terrain" width={w} height={h - ground + 24} style={{ top: ground - 24 }} preserveAspectRatio="none" aria-hidden>
        <path d={ridge(w, 24, target.id)} fill={look.ground[0]} />
        <rect x="0" y="24" width={w} height={h} fill={look.ground[1]} />
        <rect x="0" y="64" width={w} height={h} fill={look.rock[2]} opacity=".55" />
      </svg>
      {raising !== undefined && (
        <div className="st-raise" style={{ left: w / 2 + 70, height: 18 + raising * 70 }}>
          <i style={{ opacity: raising < 1 ? 0.6 : 1 }} />
        </div>
      )}
      {crates && <div className="st-crates" style={{ left: w / 2 - 90 }}><i /><i /><i /></div>}
      {target2 && (
        <svg className="st-beam" width={w} height={h} aria-hidden>
          <line x1={rocketX} y1={rocketY + 40} x2={colX(target2.col)} y2={rowY(target2.row)} />
        </svg>
      )}
      {deposits.map(d => {
        const meta = MINERAL_META[d.mineral]
        return (
          <button
            key={d.key}
            className={`st-ore${d.cut ? ' st-ore-cut' : ''}${d.locked ? ' st-ore-locked' : ''}`}
            style={{ left: colX(d.col), top: rowY(d.row), '--ore': meta?.color ?? '#ccc' } as React.CSSProperties}
            disabled={d.cut}
            onClick={() => onCut?.(d.key)}
            aria-label={`${meta?.name ?? d.mineral}${d.locked ? ', needs a stronger laser' : ''}`}
          >
            <span>{meta?.sym ?? d.mineral}</span>
          </button>
        )
      })}
      <div className={`st-ship st-ship-${rocket}`} style={{ left: rocketX - 26, top: rocketY - 40 }}>
        <img src={`${KIT}space-rocket.png`} alt="" draggable={false} />
        <img className="st-flame" src={`${KIT}flame-1.png`} alt="" draggable={false} />
      </div>
      {payload && (
        <svg className={`st-payload st-payload-${payload}`} style={{ left: rocketX - 24, top: rocketY - 70 }} viewBox="0 0 24 12" shapeRendering="crispEdges" aria-hidden>
          {payload === 'satellite' && <><rect x="0" y="4" width="8" height="4" fill="#3d6fb8" /><rect x="16" y="4" width="8" height="4" fill="#3d6fb8" /></>}
          <rect x="9" y="2" width="6" height="8" fill="#e9edf2" />
          <rect x="10" y="3" width="4" height="2" fill="#7fd4ff" />
        </svg>
      )}
    </div>
  )
}

/** A low, seeded skyline for a world's horizon, so two worlds never look the same. */
function ridge(w: number, depth: number, seed: string): string {
  let n = [...seed].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7)
  const rand = () => ((n = (n * 1664525 + 1013904223) >>> 0) / 2 ** 32)
  const steps = 14
  let d = `M0 ${depth}`
  for (let i = 0; i <= steps; i++) d += ` L${(i / steps) * w} ${depth - rand() * depth * 0.9}`
  return `${d} L${w} ${depth} Z`
}

function Streaks() {
  return <div className="st-streaks" aria-hidden><i /><i /><i /><i /></div>
}
