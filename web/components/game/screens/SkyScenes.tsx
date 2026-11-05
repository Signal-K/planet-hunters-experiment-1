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

/** Space telescope: Earth's limb below, three camera sectors above. */
export function transitGeom({ W, H, portrait }: Geom) {
  const earthR = portrait ? W * 1.7 : W * 0.95
  const limbY = H * (portrait ? 0.76 : 0.72)
  const earth = { cx: W / 2, cy: limbY + earthR, r: earthR }
  const craft = { x: portrait ? W * 0.72 : W * 0.8, y: limbY - (portrait ? 9 : 10) }
  const tw = portrait ? 34 : 38
  const th = portrait ? 22 : 24
  const spots = portrait
    ? [[0.5, 0.26], [0.5, 0.43], [0.5, 0.6]]
    : [[0.17, 0.34], [0.43, 0.26], [0.69, 0.38]]
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
  const horizon = H * (portrait ? 0.82 : 0.74)
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
  const list = Array.from({ length: count }, () => {
    const t = r()
    const colour = t < 0.12 ? '#ffd9a8' : t < 0.3 ? '#bcd4ff' : '#ffffff'
    return { x: r() * W, y: r() * H, s: 0.12 + Math.pow(r(), 3) * 0.7, o: 0.35 + r() * 0.65, colour, spike: r() > 0.965, tw: r() > 0.8 }
  })
  return (
    <g>
      {list.map((s, i) => (
        <g key={i}>
          <circle cx={s.x} cy={s.y} r={s.s} fill={warm && s.colour === '#ffffff' ? '#fff3dc' : s.colour} opacity={s.o} className={s.tw ? styles.twinkle : undefined} style={s.tw ? { animationDelay: `${-(i % 7)}s` } : undefined} />
          {s.spike && <path d={`M${s.x - 2.2} ${s.y}H${s.x + 2.2}M${s.x} ${s.y - 2.2}V${s.y + 2.2}`} stroke="#fff" strokeWidth="0.12" opacity="0.55" />}
        </g>
      ))}
    </g>
  )
}

function MilkyWay({ W, H, angle, y, h, id }: { W: number; H: number; angle: number; y: number; h: number; id: string }) {
  return (
    <g transform={`rotate(${angle} ${W / 2} ${y})`} opacity="0.9">
      <defs>
        <filter id={`${id}-dust`} x="-10%" y="-60%" width="120%" height="220%">
          <feTurbulence type="fractalNoise" baseFrequency="0.018 0.05" numOctaves="4" seed="11" result="n" />
          <feColorMatrix in="n" type="matrix" values="0 0 0 0 0.78  0 0 0 0 0.82  0 0 0 0 0.95  2.4 0 0 0 -0.85" />
          <feGaussianBlur stdDeviation="0.6" />
        </filter>
        <linearGradient id={`${id}-fade`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#7f93c7" stopOpacity="0" />
          <stop offset="0.5" stopColor="#c8d4ee" stopOpacity="0.34" />
          <stop offset="1" stopColor="#7f93c7" stopOpacity="0" />
        </linearGradient>
        <mask id={`${id}-mask`}><rect x={-W} y={y - h / 2} width={W * 3} height={h} fill={`url(#${id}-fade)`} /></mask>
      </defs>
      <rect x={-W} y={y - h / 2} width={W * 3} height={h} fill={`url(#${id}-fade)`} />
      <g mask={`url(#${id}-mask)`}><rect x={-W} y={y - h / 2} width={W * 3} height={h} filter={`url(#${id}-dust)`} /></g>
    </g>
  )
}

/** A simple satellite silhouette: bus, two solar wings, a camera barrel. */
function Craft({ x, y, s = 1, flip = false }: { x: number; y: number; s?: number; flip?: boolean }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${flip ? -s : s} ${s})`} data-testid="sky-craft">
      <rect x="-3.2" y="-3" width="6.4" height="6" rx="0.8" fill="#cdd8e6" stroke="#0c1a2e" strokeWidth="0.3" />
      <rect x="-3.2" y="-3" width="6.4" height="1.2" fill="#e9c46a" opacity="0.9" />
      <rect x="-16" y="-2" width="12" height="4" fill="#27456f" stroke="#7aa6dd" strokeWidth="0.25" />
      <rect x="4" y="-2" width="12" height="4" fill="#27456f" stroke="#7aa6dd" strokeWidth="0.25" />
      {[-13, -10, -7].map(px => <path key={px} d={`M${px} -2V2`} stroke="#7aa6dd" strokeWidth="0.15" />)}
      {[7, 10, 13].map(px => <path key={px} d={`M${px} -2V2`} stroke="#7aa6dd" strokeWidth="0.15" />)}
      <rect x="-1.6" y="-6.5" width="3.2" height="3.5" fill="#0a1424" stroke="#9fd6e4" strokeWidth="0.3" />
      <circle cx="0" cy="-6.5" r="1.3" fill="#9fd6e4" opacity="0.7" />
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

/* ───────────── Space telescope ───────────── */

export function TransitScene({ g, target }: { g: Geom; target: SkyTarget | null }) {
  const { W, H } = g
  const { earth, craft, targets, dish } = transitGeom(g)
  const detections = target
    ? (() => { const r = rng(91); return Array.from({ length: 7 }, () => ({ x: target.x + (r() - 0.5) * target.hw * 1.7, y: target.y + (r() - 0.5) * target.hh * 1.7 })) })()
    : []
  return (
    <g>
      <defs>
        <radialGradient id="tr-sky" cx="50%" cy="100%" r="110%"><stop offset="0" stopColor="#132a4d" /><stop offset="0.6" stopColor="#060d20" /><stop offset="1" stopColor="#02040c" /></radialGradient>
        <radialGradient id="tr-ocean" cx="50%" cy="0%" r="100%"><stop offset="0" stopColor="#6fc0ff" /><stop offset="0.12" stopColor="#2a74c8" /><stop offset="0.5" stopColor="#0f3a78" /><stop offset="1" stopColor="#04132c" /></radialGradient>
        <radialGradient id="tr-sun" cx="85%" cy="0%" r="55%"><stop offset="0" stopColor="#ffd08a" stopOpacity="0.9" /><stop offset="1" stopColor="#ff8a3a" stopOpacity="0" /></radialGradient>
        <filter id="tr-land" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="0.012 0.02" numOctaves="4" seed="3" /><feColorMatrix type="matrix" values="0 0 0 0 0.32  0 0 0 0 0.42  0 0 0 0 0.2  11 0 0 0 -5.3" /></filter>
        <filter id="tr-cloud" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="0.02 0.045" numOctaves="4" seed="8" /><feColorMatrix type="matrix" values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  3 0 0 0 -1.35" /></filter>
        <filter id="tr-glow" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="1.4" /></filter>
        <clipPath id="tr-earth"><circle cx={earth.cx} cy={earth.cy} r={earth.r} /></clipPath>
      </defs>
      <rect width={W} height={H} fill="url(#tr-sky)" />
      <MilkyWay W={W} H={H} angle={g.portrait ? -62 : -18} y={H * 0.32} h={H * (g.portrait ? 0.5 : 0.7)} id="tr" />
      <Stars W={W} H={H} count={g.portrait ? 170 : 260} seed={7} />
      {/* camera sectors */}
      {targets.map(t => (
        <g key={t.id} className={styles.sectorBox} data-active={target?.id === t.id}>
          <rect x={t.x - t.hw} y={t.y - t.hh} width={t.hw * 2} height={t.hh * 2} />
          <path d={`M${t.x - t.hw} ${t.y - t.hh + 3}V${t.y - t.hh}H${t.x - t.hw + 3}M${t.x + t.hw - 3} ${t.y - t.hh}H${t.x + t.hw}V${t.y - t.hh + 3}M${t.x - t.hw} ${t.y + t.hh - 3}V${t.y + t.hh}H${t.x - t.hw + 3}M${t.x + t.hw - 3} ${t.y + t.hh}H${t.x + t.hw}V${t.y + t.hh - 3}`} className={styles.corner} />
        </g>
      ))}
      {/* Earth */}
      <circle cx={earth.cx} cy={earth.cy} r={earth.r + 1.6} fill="none" stroke="#7cc4ff" strokeWidth="2.4" opacity="0.5" filter="url(#tr-glow)" />
      <circle cx={earth.cx} cy={earth.cy} r={earth.r} fill="url(#tr-ocean)" />
      <g clipPath="url(#tr-earth)">
        <rect x="0" y={earth.cy - earth.r} width={W} height={earth.r * 0.3} filter="url(#tr-land)" />
        <rect x="0" y={earth.cy - earth.r} width={W} height={earth.r * 0.3} filter="url(#tr-cloud)" opacity="0.6" />
        <rect x="0" y={earth.cy - earth.r} width={W} height={earth.r * 0.3} fill="url(#tr-sun)" />
      </g>
      <circle cx={earth.cx} cy={earth.cy} r={earth.r} fill="none" stroke="#bfe3ff" strokeWidth="0.5" opacity="0.65" />
      <Craft x={craft.x} y={craft.y} s={g.portrait ? 0.9 : 1.1} />
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

export function GroundScene({ g, target }: { g: Geom; target: SkyTarget | null }) {
  const { W, H } = g
  const { horizon, p0, p1, p2, targets, dome } = groundGeom(g)
  const r = rng(5)
  const trees = Array.from({ length: g.portrait ? 12 : 26 }, () => ({ x: r() * W, h: 3 + r() * 6 }))
  const mover = Array.from({ length: 6 }, (_, i) => { const [x, y] = quad(p0, p1, p2, 0.12 + i * 0.15); return { x, y: y - 3 + (i % 3) * 3 } })
  const slitAngle = target ? Math.max(-24, Math.min(24, (target.x - dome.x) / 3)) : 0
  const beamTop = target ? { x: target.x, y: target.y } : null
  return (
    <g>
      <defs>
        <linearGradient id="gr-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#030816" /><stop offset="0.55" stopColor="#0c2347" /><stop offset="0.86" stopColor="#2a4466" /><stop offset="1" stopColor="#8a6a58" /></linearGradient>
        <linearGradient id="gr-ridge1" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#14202f" /><stop offset="1" stopColor="#070c14" /></linearGradient>
        <filter id="gr-beam" x="-50%" y="-5%" width="200%" height="110%"><feGaussianBlur stdDeviation="0.5" /></filter>
        <filter id="gr-fog" x="0" y="0" width="100%" height="100%"><feGaussianBlur stdDeviation="1.8" /></filter>
      </defs>
      <rect width={W} height={H} fill="url(#gr-sky)" />
      <MilkyWay W={W} H={H} angle={g.portrait ? -74 : -28} y={H * 0.36} h={H * (g.portrait ? 0.4 : 0.55)} id="gr" />
      <Stars W={W} H={H} count={g.portrait ? 200 : 300} seed={13} />
      <path d={`M${p0[0]} ${p0[1]} Q ${p1[0]} ${p1[1]} ${p2[0]} ${p2[1]}`} className={styles.ecliptic} />
      {targets.map(t => <circle key={t.id} cx={t.x} cy={t.y} r={t.hw} className={styles.sector} data-active={target?.id === t.id} />)}
      {mover.map((m, i) => <g key={i} className={styles.mover} style={{ animationDelay: `${-i * 1.7}s` }}><circle cx={m.x} cy={m.y} r="0.55" fill="#dfe9ff" /><path d={`M${m.x - 3} ${m.y + 0.4}L${m.x - 0.6} ${m.y}`} stroke="#dfe9ff" strokeWidth="0.2" opacity="0.5" /></g>)}
      {/* ridges and trees */}
      <path d={`M0 ${horizon - 9} Q ${W * 0.2} ${horizon - 17} ${W * 0.42} ${horizon - 8} T ${W * 0.8} ${horizon - 12} T ${W} ${horizon - 7} V ${H} H0Z`} fill="#1b2c40" opacity="0.8" filter="url(#gr-fog)" />
      <path d={`M0 ${horizon - 4} Q ${W * 0.15} ${horizon - 11} ${W * 0.35} ${horizon - 4} T ${W * 0.7} ${horizon - 6} T ${W} ${horizon - 3} V ${H} H0Z`} fill="url(#gr-ridge1)" />
      <path d={`M0 ${horizon + 1} Q ${W * 0.3} ${horizon - 3} ${W * 0.5} ${horizon + 1} T ${W} ${horizon + 1} V ${H} H0Z`} fill="#03060b" />
      {trees.map((t, i) => <path key={i} d={`M${t.x} ${horizon + 2}l-1.2 0 1.2 -${t.h} 1.2 ${t.h}z`} fill="#02040a" />)}
      {/* the observatory */}
      <g transform={`translate(${dome.x} ${dome.y}) scale(1.4)`}>
        <rect x="-9" y="-1" width="18" height="6" fill="#0a111c" stroke="#1d2f47" strokeWidth="0.25" />
        <path d="M-7.5 -1 A7.5 7.5 0 0 1 7.5 -1Z" fill="#c9d3df" stroke="#20324a" strokeWidth="0.35" />
        <g transform={`rotate(${slitAngle} 0 -1)`}>
          <rect x="-1.1" y="-8.5" width="2.2" height="7.5" fill={target ? '#ffe39a' : '#0a111c'} className={styles.slit} />
        </g>
        <path d="M-7.5 -1 A7.5 7.5 0 0 1 7.5 -1" fill="none" stroke="#7aa6dd" strokeWidth="0.2" opacity="0.7" />
        <rect x="10" y="1" width="9" height="4" fill="#0a111c" />
        <rect x="11.2" y="1.8" width="1.4" height="1.2" fill="#ffd98a" /><rect x="14" y="1.8" width="1.4" height="1.2" fill="#ffd98a" />
        <path d="M-18 4 L-18 -5 L-16.6 -5 L-16.6 4Z" fill="#0a111c" /><circle cx="-17.3" cy="-5.3" r="0.6" fill="#ff4d4d" className={styles.blink} />
      </g>
      {target && beamTop && (
        <g data-testid="sky-signal">
          <line x1={dome.x} y1={dome.y - 11} x2={beamTop.x} y2={beamTop.y} stroke="#9bff9b" strokeWidth="1.6" opacity="0.28" filter="url(#gr-beam)" />
          <line x1={dome.x} y1={dome.y - 11} x2={beamTop.x} y2={beamTop.y} stroke="#caffca" strokeWidth="0.35" className={styles.laser} />
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
  const zoom = target && zoomed
    ? `translate(${W / 2}px, ${H / 2}px) scale(3.4) translate(${-target.x}px, ${-target.y}px)`
    : `translate(${W / 2}px, ${H / 2}px) scale(1) translate(${-W / 2}px, ${-H / 2}px)`
  return (
    <g>
      <defs>
        <radialGradient id="sat-bg" cx="60%" cy="45%" r="90%"><stop offset="0" stopColor="#10172b" /><stop offset="1" stopColor="#02040a" /></radialGradient>
        <linearGradient id="sat-body" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#c8ab74" /><stop offset="0.12" stopColor="#e9d5a2" /><stop offset="0.26" stopColor="#b8935a" /><stop offset="0.38" stopColor="#ecd9aa" />
          <stop offset="0.52" stopColor="#c9a869" /><stop offset="0.66" stopColor="#e4cd9a" /><stop offset="0.8" stopColor="#a98456" /><stop offset="1" stopColor="#8a6a3e" />
        </linearGradient>
        <radialGradient id="sat-shade" cx="35%" cy="38%" r="75%"><stop offset="0.35" stopColor="#000" stopOpacity="0" /><stop offset="0.85" stopColor="#1a0f04" stopOpacity="0.55" /><stop offset="1" stopColor="#000" stopOpacity="0.85" /></radialGradient>
        <filter id="sat-bands" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="0.004 0.11" numOctaves="3" seed="6" /><feColorMatrix type="matrix" values="0 0 0 0 0.45  0 0 0 0 0.3  0 0 0 0 0.12  1.6 0 0 0 -0.45" /></filter>
        <filter id="sat-glow" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="2.4" /></filter>
        <clipPath id="sat-planet"><circle cx={cx} cy={cy} r={R} /></clipPath>
        <clipPath id="sat-back"><rect x={cx - R * 3} y={cy - R * 3} width={R * 6} height={R * 3} /></clipPath>
        <clipPath id="sat-front"><rect x={cx - R * 3} y={cy} width={R * 6} height={R * 3} /></clipPath>
      </defs>
      <rect width={W} height={H} fill="url(#sat-bg)" />
      <g className={styles.zoomLayer} style={{ transform: zoom }} data-testid="sky-zoom">
        <Stars W={W} H={H} count={g.portrait ? 120 : 170} seed={21} />
        <circle cx={cx} cy={cy} r={R * 1.05} fill="#e3c88f" opacity="0.28" filter="url(#sat-glow)" />
        <Rings g={g} half="back" />
        <circle cx={cx} cy={cy} r={R} fill="url(#sat-body)" />
        <g clipPath="url(#sat-planet)">
          <rect x={cx - R} y={cy - R} width={R * 2} height={R * 2} filter="url(#sat-bands)" />
          <ellipse cx={cx} cy={cy - R * 0.02} rx={R * 1.1} ry={R * 0.075} fill="#1a0f04" opacity="0.3" transform={`rotate(-16 ${cx} ${cy})`} />
          <circle cx={cx} cy={cy} r={R} fill="url(#sat-shade)" />
        </g>
        <Rings g={g} half="front" />
        <circle cx={cx + R * 2.7} cy={cy - R * 0.55} r="1.3" fill="#e8a64d" /><circle cx={cx + R * 2.7} cy={cy - R * 0.55} r="2.8" fill="#e8a64d" opacity="0.22" />
        <circle cx={cx - R * 2.3} cy={cy + R * 0.7} r="0.5" fill="#fff" />
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
      <g transform={`translate(${craft.x} ${craft.y}) rotate(-20)`} data-testid="sky-craft" className={styles.craft} data-parked={Boolean(target)}>
        <rect x="-3" y="-2.6" width="6" height="5.2" fill="#c4cdd8" stroke="#0c1a2e" strokeWidth="0.3" />
        <rect x="-3" y="-2.6" width="6" height="1.1" fill="#e9c46a" />
        <path d="M-1 -2.6 L-6.4 -9.5 Q 0 -13 6.4 -9.5 L1 -2.6Z" fill="#e4e9ef" stroke="#0c1a2e" strokeWidth="0.3" />
        <path d="M0 -2.6V-11" stroke="#0c1a2e" strokeWidth="0.3" />
        <rect x="-8.4" y="-1.4" width="5.4" height="2" fill="#4d5560" /><rect x="3" y="-1.4" width="5.4" height="2" fill="#4d5560" />
      </g>
      <circle cx={earth.x} cy={earth.y} r="3.4" fill="#4aa3ff" /><circle cx={earth.x} cy={earth.y} r="3.4" fill="none" stroke="#bfe3ff" strokeWidth="0.3" />
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
