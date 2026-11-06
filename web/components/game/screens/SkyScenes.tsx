import { useMemo } from 'react'
import { PixelImage, PixelStar, useEarthImage, useGroundImage, useProbeImage, useSaturnImage, useTelescopeImage } from './SkyPixels'
import type { InstrumentPointing } from '@/lib/research/paths'
import styles from './SkyPointing.module.css'

/** A spot you can aim at. Positions are in view units; the view is as tall or as wide as 100 units, whichever is shorter. */
export interface SkyTarget { id: string; name: string; note: string; coord: string; x: number; y: number; hw: number; hh: number; side?: 'above' | 'below' | 'left' | 'right' }
export interface Geom { W: number; H: number; portrait: boolean }

const rad = (deg: number) => (deg * Math.PI) / 180
const quad = (p0: number[], p1: number[], p2: number[], t: number) => [
  (1 - t) ** 2 * p0[0] + 2 * (1 - t) * t * p1[0] + t ** 2 * p2[0],
  (1 - t) ** 2 * p0[1] + 2 * (1 - t) * t * p1[1] + t ** 2 * p2[1],
]
const ellipsePath = (cx: number, cy: number, rx: number, ry: number) =>
  `M${cx - rx} ${cy}A${rx} ${ry} 0 1 0 ${cx + rx} ${cy}A${rx} ${ry} 0 1 0 ${cx - rx} ${cy}Z`

function rng(seed0: number) {
  let seed = seed0
  return () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647 }
}

/** Space telescope: Earth's limb below, three real star fields above (each target sits on what it names). */
export function transitGeom({ W, H, portrait }: Geom) {
  const earthR = portrait ? W * 1.7 : W * 0.95
  const limbY = H * (portrait ? 0.7 : 0.6)
  const earth = { cx: W / 2, cy: limbY + earthR, r: earthR }
  const craft = { x: portrait ? W * 0.72 : W * 0.74, y: limbY - (portrait ? 8 : 3) }
  const tw = portrait ? 34 : 38
  const th = portrait ? 22 : 24
  const spots = portrait
    ? [[0.5, 0.2], [0.5, 0.35], [0.5, 0.5]]
    : [[0.15, 0.22], [0.43, 0.2], [0.6, 0.22]]
  const targets: SkyTarget[] = [
    { id: 'north', name: 'Cygnus field', note: 'A dense patch of stars. Many will have planets.', coord: 'RA 19h 24m · DEC +44°' },
    { id: 'plane', name: 'Galactic plane', note: 'The Milky Way crowds the frame with stars.', coord: 'RA 18h 05m · DEC −20°' },
    { id: 'south', name: 'Southern field', note: 'A quiet field of bright, nearby stars.', coord: 'RA 06h 10m · DEC −64°' },
  ].map((t, i) => ({ ...t, x: spots[i][0] * W, y: spots[i][1] * H, hw: tw / 2, hh: th / 2 }))
  return { earth, craft, targets, limbY, dish: { x: W * 0.28, y: limbY + 4 } }
}

const g_ts = (portrait: boolean) => (portrait ? [0.2, 0.5, 0.8] : [0.16, 0.44, 0.72])

/** Ground telescope: dome on a ridge, targets along the ecliptic. */
export function groundGeom({ W, H, portrait }: Geom) {
  const horizon = H * (portrait ? 0.82 : 0.66)
  const p0 = [0, H * (portrait ? 0.6 : 0.6)]
  const p1 = [W / 2, H * (portrait ? 0.12 : 0.04)]
  const p2 = [W, p0[1]]
  const ts = g_ts(portrait)
  const targets: SkyTarget[] = [
    { id: 'evening', name: 'Evening sky', note: 'Low in the west after sunset.', coord: 'ECL +12° · AZ 262°' },
    { id: 'opposition', name: 'Opposition', note: 'Straight overhead at midnight: the best place to catch movers.', coord: 'ECL 0° · AZ 180°' },
    { id: 'morning', name: 'Morning sky', note: 'Rising in the east before dawn.', coord: 'ECL −12° · AZ 98°' },
  ].map((t, i) => { const [x, y] = quad(p0, p1, p2, ts[i]); return { ...t, x, y, hw: portrait ? 9 : 11, hh: portrait ? 9 : 11 } })
  return { horizon, p0, p1, p2, targets, dome: { x: W / 2, y: horizon } }
}

/** Saturn orbiter: the planet and its rings, with small precise targets. */
export function saturnGeom({ W, H, portrait }: Geom) {
  const R = portrait ? W * 0.2 : H * 0.27
  const cx = portrait ? W * 0.52 : W * 0.5
  const cy = portrait ? H * 0.4 : H * 0.46
  const tilt = -16
  const k = 0.24
  const ringPoint = (angleDeg: number, mul: number) => {
    const lx = mul * R * Math.cos(rad(angleDeg))
    const ly = mul * R * k * Math.sin(rad(angleDeg))
    const t = rad(tilt)
    return [cx + lx * Math.cos(t) - ly * Math.sin(t), cy + lx * Math.sin(t) + ly * Math.cos(t)]
  }
  const [rx, ry] = ringPoint(32, 2.15)
  const targets: SkyTarget[] = [
    { id: 'pole', name: 'North polar hexagon', note: 'A six-sided jet stream circles the pole.', coord: 'LAT +78° · 12 km/pixel', x: cx + R * 0.05, y: cy - R * 0.86, hw: 5.5, hh: 5.5, side: 'above' },
    { id: 'band', name: 'Storm band', note: 'Giant storms break out in the cloud belts.', coord: 'LAT +36° · 28 km/pixel', x: cx - R * 0.42, y: cy - R * 0.12, hw: 5.5, hh: 5.5, side: 'left' },
    { id: 'ring', name: 'Encke gap', note: 'A thin gap in the outer rings, edged with ripples.', coord: 'RING A · 133,500 km', x: rx, y: ry, hw: 5.5, hh: 5.5, side: portrait ? 'left' : 'below' },
  ]
  return { R, cx, cy, tilt, k, targets, earth: { x: portrait ? W * 0.14 : W * 0.08, y: portrait ? H * 0.14 : H * 0.2 }, craft: { x: portrait ? W * 0.3 : W * 0.26, y: portrait ? H * 0.74 : H * 0.72 }, ringPoint }
}

export function Stars({ W, H, count, seed, warm = false }: { W: number; H: number; count: number; seed: number; warm?: boolean }) {
  const r = rng(seed)
  return (
    <g>
      {Array.from({ length: count }, (_, i) => {
        const t = r()
        const colour = t < 0.12 ? '#ffd9a8' : t < 0.3 ? '#bcd4ff' : warm ? '#fff3dc' : '#ffffff'
        return <PixelStar key={i} x={r() * W} y={r() * H} tone={colour} big={r() > 0.97} opacity={0.5 + r() * 0.5} />
      })}
    </g>
  )
}

export function Sight({ kind, w, h, locked }: { kind: 'frame' | 'cross' | 'zoom'; w: number; h: number; locked: boolean }) {
  const c = styles.reticle
  if (kind === 'frame') return (
    <g data-testid="sky-reticle" data-locked={locked}>
      <rect x={-w / 2} y={-h / 2} width={w} height={h} className={c} strokeDasharray={locked ? undefined : '2.4 1.4'} />
      <path d={`M${-w / 2 - 3} 0H${-w / 2 + 3}M${w / 2 - 3} 0H${w / 2 + 3}M0 ${-h / 2 - 3}V${-h / 2 + 3}M0 ${h / 2 - 3}V${h / 2 + 3}`} className={c} />
    </g>
  )
  if (kind === 'zoom') return (
    <g data-testid="sky-reticle" data-locked={locked}>
      <circle r="4" className={c} />
      <path d="M-7 -3V-7H-3M7 -3V-7H3M-7 3V7H-3M7 3V7H3" className={c} />
    </g>
  )
  return (
    <g data-testid="sky-reticle" data-locked={locked}>
      <circle r="5" className={c} />
      <path d="M-9 0H-3M3 0H9M0 -9V-3M0 3V9" className={c} />
    </g>
  )
}

/** A cluster of stars thickest at the middle, so a field reads as a place and not a rectangle. One cell per star. */
function Cluster({ cx, cy, rx, ry, count, seed, angle = 0, tone = '#ffffff' }: { cx: number; cy: number; rx: number; ry: number; count: number; seed: number; angle?: number; tone?: string }) {
  const r = rng(seed)
  const a = rad(angle)
  return (
    <g>
      {Array.from({ length: count }, (_, i) => {
        const gx = (r() + r() + r() - 1.5) / 1.5
        const gy = (r() + r() + r() - 1.5) / 1.5
        const lx = gx * rx
        const ly = gy * ry
        return <PixelStar key={i} x={cx + lx * Math.cos(a) - ly * Math.sin(a)} y={cy + lx * Math.sin(a) + ly * Math.cos(a)} tone={tone} opacity={0.45 + r() * 0.55} />
      })}
    </g>
  )
}

function Bright({ x, y, r = 0.9, tone = '#ffffff' }: { x: number; y: number; r?: number; tone?: string }) {
  return <PixelStar x={x} y={y} tone={tone} big={r > 0.7} />
}

/**
 * What each target actually is, drawn at the target: Cygnus's Northern Cross in its dense star cloud, a thick lump
 * of the Milky Way's plane, and the Southern Cross with the Pointers and the Large Magellanic Cloud.
 */
function StarField({ target: t, active, portrait }: { target: SkyTarget; active: boolean; portrait: boolean }) {
  const line = { stroke: active ? '#ffd678' : '#9fd6e4', strokeWidth: 0.18, opacity: active ? 0.85 : 0.45, fill: 'none' } as const
  const k = portrait ? 0.85 : 1
  return (
    <g transform={`translate(${t.x} ${t.y}) scale(${k})`} data-testid={`sky-field-${t.id}`} data-active={active}>
      {active && <ellipse rx={t.hw * 1.05} ry={t.hh * 1.1} fill="none" stroke="#ffd678" strokeWidth="0.4" strokeDasharray="1.5 1.5" />}
      {t.id === 'north' && (
        <>
          <Cluster cx={0} cy={0} rx={t.hw * 0.95} ry={t.hh * 0.9} count={150} seed={21} />
          <path d="M0 -9L0 0L0 9.5M-8 -1.5L0 0L7 1.5" {...line} />
          <Bright x={0} y={-9} r={1.1} tone="#dbe8ff" />
          <Bright x={0} y={0} r={0.9} tone="#ffe7bd" />
          <Bright x={0} y={9.5} r={0.8} tone="#ffd29a" />
          <Bright x={-8} y={-1.5} r={0.6} />
          <Bright x={7} y={1.5} r={0.6} tone="#cfe0ff" />
        </>
      )}
      {t.id === 'plane' && (
        <>
          <Cluster cx={0} cy={0} rx={t.hw * 1.1} ry={t.hh * 0.5} count={260} seed={33} angle={-18} tone="#f1f4ff" />
          <Cluster cx={-3} cy={1} rx={t.hw * 0.5} ry={t.hh * 0.25} count={90} seed={35} angle={-18} tone="#ffe2b8" />
          <Bright x={5} y={-3} r={0.8} tone="#ffe7bd" />
          <Bright x={-9} y={2} r={0.7} tone="#cfe0ff" />
        </>
      )}
      {t.id === 'south' && (
        <>
          <Cluster cx={t.hw * 0.62} cy={-t.hh * 0.45} rx={4.5} ry={2.6} count={40} seed={47} angle={-20} tone="#dce6ff" />
          <path d="M0 8L0 -8M-5.5 1.5L4.5 -1.5" {...line} />
          <path d="M-17 5L-12 8" {...line} />
          <Bright x={0} y={8} r={1.1} tone="#bcd4ff" />
          <Bright x={0} y={-8} r={0.9} tone="#ffbf8a" />
          <Bright x={-5.5} y={1.5} r={0.9} tone="#bcd4ff" />
          <Bright x={4.5} y={-1.5} r={0.7} tone="#cfe0ff" />
          <Bright x={1.4} y={2} r={0.4} />
          <Bright x={-17} y={5} r={1.1} tone="#bcd4ff" />
          <Bright x={-12} y={8} r={0.9} tone="#cfe0ff" />
        </>
      )}
    </g>
  )
}

/**
 * The space telescope: four wide-field cameras on the front of a bus with two solar wings, lit from the sun's side.
 * The whole spacecraft slews so the cameras face wherever the sight is, and a faint sightline joins lens and sight.
 */
function TelescopeCraft({ x, y, aim, sighting }: { x: number; y: number; aim: { x: number; y: number }; sighting: boolean }) {
  const dx = aim.x - x
  const dy = aim.y - y
  const raw = (Math.atan2(dx, -dy) * 180) / Math.PI
  const angle = Math.max(-75, Math.min(75, raw))
  const len = Math.hypot(dx, dy)
  const sprite = useTelescopeImage(angle)
  const tip = { x: x + Math.sin(rad(sprite.step)) * 11, y: y - Math.cos(rad(sprite.step)) * 11 }
  return (
    <g data-testid="sky-craft" data-angle={Math.round(angle)}>
      {sighting && len > 16 && <line x1={tip.x} y1={tip.y} x2={aim.x} y2={aim.y} stroke="#9fd6e4" strokeWidth="0.4" strokeDasharray="1 2" opacity="0.7" />}
      <PixelImage href={sprite.src} x={Math.round(x - sprite.px)} y={Math.round(y - sprite.py)} w={sprite.size} h={sprite.size} />
    </g>
  )
}

/* ───────────── Space telescope ───────────── */

export function TransitScene({ g, target, aim, bare = false }: { g: Geom; target: SkyTarget | null; aim: { x: number; y: number }; bare?: boolean }) {
  const { W, H } = g
  const { earth, craft, targets, dish } = transitGeom(g)
  const earthImg = useEarthImage(W, H, earth)
  const detections = target
    ? (() => { const r = rng(91); return Array.from({ length: 7 }, () => ({ x: target.x + (r() - 0.5) * target.hw * 1.7, y: target.y + (r() - 0.5) * target.hh * 1.7 })) })()
    : []
  return (
    <g>
      {/* the three star fields, drawn where their targets are */}
      {!bare && targets.map(t => <StarField key={t.id} target={t} active={target?.id === t.id} portrait={g.portrait} />)}
      {/* Earth: pixel art, same palette family as the flight sprite */}
      <PixelImage href={earthImg} x={0} y={0} w={Math.ceil(W)} h={Math.ceil(H)} testId="sky-earth" />
      <TelescopeCraft x={craft.x} y={craft.y} aim={aim} sighting={!target} />
      {target && (
        <g data-testid="sky-signal">
          {detections.map((d, i) => <path key={i} d={`M${d.x - 1.6} ${d.y - 0.6}V${d.y - 1.6}H${d.x - 0.6}M${d.x + 0.6} ${d.y - 1.6}H${d.x + 1.6}V${d.y - 0.6}M${d.x - 1.6} ${d.y + 0.6}V${d.y + 1.6}H${d.x - 0.6}M${d.x + 0.6} ${d.y + 1.6}H${d.x + 1.6}V${d.y + 0.6}`} className={styles.detect} style={{ animationDelay: `${i * 0.35}s` }} />)}
          <rect x={target.x - target.hw} y={target.y - target.hh} width="1.2" height={target.hh * 2} className={styles.sweep} style={{ ['--sweep' as string]: `${target.hw * 2 - 1.2}px` }} />
          <line x1={target.x} y1={target.y + target.hh} x2={craft.x} y2={craft.y - 6} className={styles.beam} />
          {[0, 1, 2].map(i => <circle key={i} r={0.9} className={styles.packet} style={{ offsetPath: `path('M${target.x} ${target.y + target.hh} L ${craft.x} ${craft.y - 6}')`, animationDelay: `${i * 0.9}s` }} />)}
          <path d={`M${craft.x - 4} ${craft.y + 3} Q ${(craft.x + dish.x) / 2} ${craft.y + 14} ${dish.x} ${dish.y}`} className={styles.beam} />
          {[0, 1, 2].map(i => <circle key={i} r={0.9} className={styles.packet} style={{ offsetPath: `path('M${craft.x - 4} ${craft.y + 3} Q ${(craft.x + dish.x) / 2} ${craft.y + 14} ${dish.x} ${dish.y}')`, animationDelay: `${i * 0.9 + 0.4}s` }} />)}
          <circle cx={dish.x} cy={dish.y} r="3" className={styles.ring} />
        </g>
      )}
    </g>
  )
}

/* ───────────── Ground telescope ───────────── */

export function GroundScene({ g, target, bare = false }: { g: Geom; target: SkyTarget | null; bare?: boolean }) {
  const { W, H } = g
  const { horizon, p0, p1, p2, targets, dome } = groundGeom(g)
  const groundImg = useGroundImage(W, H, { horizon, dome }, g.portrait)
  const mover = Array.from({ length: 6 }, (_, i) => { const [x, y] = quad(p0, p1, p2, 0.12 + i * 0.15); return { x, y: y - 3 + (i % 3) * 3 } })
  const slitAngle = target ? Math.max(-24, Math.min(24, (target.x - dome.x) / 3)) : 0
  const beamTop = target ? { x: target.x, y: target.y } : null
  return (
    <g>
      <PixelImage href={groundImg} x={0} y={0} w={Math.ceil(W)} h={Math.ceil(H)} />
      {!bare && <path d={`M${p0[0]} ${p0[1]} Q ${p1[0]} ${p1[1]} ${p2[0]} ${p2[1]}`} className={styles.ecliptic} />}
      {!bare && targets.map(t => <circle key={t.id} cx={t.x} cy={t.y} r={t.hw} className={styles.sector} data-active={target?.id === t.id} />)}
      {!bare && mover.map((m, i) => <g key={i} className={styles.mover} style={{ animationDelay: `${-i * 1.7}s` }}><circle cx={m.x} cy={m.y} r="0.55" fill="#dfe9ff" /><path d={`M${m.x - 3} ${m.y + 0.4}L${m.x - 0.6} ${m.y}`} stroke="#dfe9ff" strokeWidth="0.2" opacity="0.5" /></g>)}
      {/* the dome's slit lights up when a target is locked */}
      {target && <rect x={Math.round(dome.x) - 1} y={Math.round(dome.y) - 12} width="3" height="11" fill="#ffe39a" transform={`rotate(${slitAngle} ${Math.round(dome.x)} ${Math.round(dome.y) - 1})`} />}
      <rect x={Math.round(dome.x) - 26} y={Math.round(dome.y) - 12} width="2" height="2" fill="#ff4d4d" className={styles.blink} />
      {target && beamTop && (
        <g data-testid="sky-signal">
          <line x1={dome.x} y1={dome.y - 11} x2={beamTop.x} y2={beamTop.y} stroke="#caffca" strokeWidth="0.6" strokeDasharray="1.5 1" className={styles.laser} />
          <circle cx={beamTop.x} cy={beamTop.y} r="1.1" fill="#caffca" className={styles.blink} />
          {[0, 1, 2, 3].map(i => <circle key={i} r={0.8} className={styles.packet} style={{ offsetPath: `path('M${beamTop.x} ${beamTop.y} L ${dome.x} ${dome.y - 11}')`, animationDelay: `${i * 0.7}s` }} />)}
          <circle cx={beamTop.x} cy={beamTop.y} r={target.hw} className={styles.lockRing} />
        </g>
      )}
    </g>
  )
}

/* ───────────── Saturn orbiter ───────────── */

function Rings({ g, half }: { g: Geom; half: 'back' | 'front' }) {
  const { R, cx, cy, tilt, k } = saturnGeom(g)
  const bands: [number, number, string, number][] = [
    [1.24, 1.52, '#7a6446', 0.5], [1.52, 1.94, '#e6d1a3', 0.92], [2.03, 2.27, '#c4ad80', 0.72], [2.31, 2.34, '#e8dcc0', 0.55],
  ]
  const clip = half === 'back' ? 'sat-back' : 'sat-front'
  return (
    <g transform={`rotate(${tilt} ${cx} ${cy})`} clipPath={`url(#${clip})`}>
      {bands.map(([a, b, fill, o], i) => (
        <path key={i} d={`${ellipsePath(cx, cy, R * b, R * b * k)}${ellipsePath(cx, cy, R * a, R * a * k)}`} fillRule="evenodd" fill={fill} opacity={o} />
      ))}
      {[1.62, 1.74, 1.86, 2.1, 2.18].map((m, i) => <path key={i} d={ellipsePath(cx, cy, R * m, R * m * k)} fill="none" stroke="#2a1d0e" strokeWidth="0.18" opacity="0.3" />)}
    </g>
  )
}

export function SaturnScene({ g, target, zoomed }: { g: Geom; target: SkyTarget | null; zoomed: boolean }) {
  const { W, H } = g
  const s = saturnGeom(g)
  const { R, cx, cy, craft, earth, targets } = s
  const planetImg = useSaturnImage(W, H, s)
  const probe = useProbeImage()
  const zoom = target && zoomed
    ? `translate(${W / 2}px, ${H / 2}px) scale(3.4) translate(${-target.x}px, ${-target.y}px)`
    : `translate(${W / 2}px, ${H / 2}px) scale(1) translate(${-W / 2}px, ${-H / 2}px)`
  return (
    <g>
      <g className={styles.zoomLayer} style={{ transform: zoom }} data-testid="sky-zoom">
        <Stars W={W} H={H} count={g.portrait ? 120 : 170} seed={21} />
        <PixelImage href={planetImg} x={0} y={0} w={Math.ceil(W)} h={Math.ceil(H)} />
        <rect x={Math.round(cx + R * 2.7) - 1} y={Math.round(cy - R * 0.55) - 1} width="3" height="3" fill="#e8a64d" />
        <rect x={Math.round(cx - R * 2.3)} y={Math.round(cy + R * 0.7)} width="1" height="1" fill="#fff" />
        {/* close-up detail, revealed by the zoom */}
        {target && (
          <g className={styles.detail} data-on={zoomed}>
            {target.id === 'pole' && (
              <g transform={`translate(${target.x} ${target.y})`}>
                <polygon points="0,-6.4 5.5,-3.2 5.5,3.2 0,6.4 -5.5,3.2 -5.5,-3.2" fill="#5a7396" opacity="0.5" stroke="#cfe0f7" strokeWidth="0.35" />
                <polygon points="0,-4.6 4,-2.3 4,2.3 0,4.6 -4,2.3 -4,-2.3" fill="none" stroke="#e8f1ff" strokeWidth="0.15" opacity="0.5" />
                <g className={styles.swirl}>
                  {[3.4, 2.4, 1.5].map((r, i) => <path key={i} d={`M${-r} 0 A${r} ${r} 0 1 1 ${r} 0 A${r * 0.8} ${r * 0.8} 0 1 1 ${-r * 0.4} ${r * 0.3}`} fill="none" stroke="#f3f8ff" strokeWidth="0.2" opacity={0.7 - i * 0.12} />)}
                </g>
                <circle r="0.9" fill="#1b2a44" opacity="0.8" />
              </g>
            )}
            {target.id === 'band' && (
              <g transform={`translate(${target.x} ${target.y})`} className={styles.swirl}>
                {[1, 2, 3, 4].map(i => <path key={i} d={`M0 0 m${-i * 0.5} 0 a${i * 0.9} ${i * 0.6} 0 1 1 ${i * 1.4} ${i * 0.4}`} fill="none" stroke="#fff6dc" strokeWidth="0.25" opacity={0.75 - i * 0.12} />)}
                <ellipse rx="1.6" ry="1" fill="#fff3d0" opacity="0.8" />
              </g>
            )}
            {target.id === 'ring' && (
              <g transform={`translate(${target.x} ${target.y}) rotate(${s.tilt + 32 * 0.2})`}>
                <rect x="-6" y="-0.45" width="12" height="0.9" fill="#050812" opacity="0.85" />
                {[-2.6, -1.8, 1.4, 2.4, 3.2].map((y, i) => <rect key={i} x="-6" y={y} width="12" height="0.35" fill="#e8d8b0" opacity={0.7 - i * 0.08} />)}
                <path d="M-6 -1.2 q1.5 -1 3 0 t3 0 t3 0 t3 0" fill="none" stroke="#fff2cc" strokeWidth="0.2" opacity="0.8" />
              </g>
            )}
          </g>
        )}
      </g>
      {/* spacecraft and downlink, never zoomed */}
      <g data-testid="sky-craft" className={styles.craft} data-parked={Boolean(target)}>
        <PixelImage href={probe.src} x={Math.round(craft.x - probe.w / 2)} y={Math.round(craft.y - probe.h / 2)} w={probe.w} h={probe.h} />
      </g>
      {/* Earth, a small blue dot, drawn as pixels */}
      <g>{[[3, 0], [5, 1], [7, 2], [7, 3], [7, 4], [5, 5], [3, 6]].map(([n, row], i) => <rect key={i} x={Math.round(earth.x) - (n - 1) / 2 - 0.5} y={Math.round(earth.y) - 3 + (row ?? i)} width={n} height="1" fill="#4aa3ff" />)}</g>
      {target && (
        <g data-testid="sky-signal">
          <line x1={craft.x} y1={craft.y - 8} x2={earth.x} y2={earth.y} className={styles.beam} />
          {[0, 1, 2, 3].map(i => <circle key={i} r={0.9} className={styles.packet} style={{ offsetPath: `path('M${craft.x} ${craft.y - 8} L ${earth.x} ${earth.y}')`, animationDelay: `${i * 0.7}s` }} />)}
          {[0, 1, 2].map(i => <circle key={i} cx={earth.x} cy={earth.y} r={4} className={styles.ring} style={{ animationDelay: `${i * 0.9}s` }} />)}
        </g>
      )}
      {!zoomed && targets.map(t => (
        <g key={t.id} className={styles.pin} data-active={target?.id === t.id}>
          <circle cx={t.x} cy={t.y} r={t.hw} /><circle cx={t.x} cy={t.y} r="0.5" />
        </g>
      ))}
    </g>
  )
}

export type { InstrumentPointing }
