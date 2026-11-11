'use client'

import { useMemo } from 'react'
import overviewStyles from './SkyPointing.module.css'
import { DEC_FIELDS, FIELD_DEG, LANDMARKS, RA_FIELDS, fieldId, galacticLatitude, raDelta, wrapRa, type SkyAim, type SkyMap } from '@/lib/research/sky-map'
import type { Geom } from './SkyScenes'
import { skyMapStyles as styles } from '@/components/game/sky/SkyMapBase'

/** View units per degree of sky. The view is 100 units on its short side, so a phone held upright shows about 50 degrees across. */
export const CHART_K = 2

const STAR_CELL = 5

/** Where a sky position lands in view units when the chart is centred on `aim` (east, the larger RA, to the left, as on a sky map). */
export function project(aim: SkyAim, g: Pick<Geom, 'W' | 'H' | 'portrait'>, ra: number, dec: number): { x: number; y: number } {
  const c = sightCentre(g)
  return { x: c.x - raDelta(ra, aim.ra) * CHART_K, y: c.y - (dec - aim.dec) * CHART_K }
}

/** Where the sight sits on screen: above the horizon, which fills the lower part of the view. */
export function sightCentre(g: Pick<Geom, 'W' | 'H' | 'portrait'>): { x: number; y: number } {
  return { x: g.W / 2, y: g.H * (g.portrait ? 0.45 : 0.36) }
}

function cellRandom(ri: number, di: number) {
  let seed = (Math.imul(ri + 1000, 73856093) ^ Math.imul(di + 1000, 19349663)) >>> 0
  if (seed === 0) seed = 1
  return () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296 }
}

interface Star { ra: number; dec: number; big: boolean; warm: boolean; size: number; o: number }

/** The stars in one 5-degree cell. The same cell always gives the same stars, thickest along the Milky Way. */
function cellStars(ri: number, di: number): Star[] {
  const ra0 = ri * STAR_CELL
  const dec0 = di * STAR_CELL
  const centre = { ra: ra0 + STAR_CELL / 2, dec: dec0 + STAR_CELL / 2 }
  const b = galacticLatitude(centre)
  const density = Math.exp(-((b / 14) ** 2))
  const r = cellRandom(ri, di)
  const count = Math.round(0.6 + r() * 1.2 + density * 5)
  return Array.from({ length: count }, () => ({
    ra: ra0 + r() * STAR_CELL,
    dec: dec0 + r() * STAR_CELL,
    big: r() > 0.96,
    warm: r() > 0.8,
    size: 0.14 + r() * 0.16,
    o: 0.4 + r() * 0.6,
  }))
}

interface Props {
  g: Geom
  aim: SkyAim
  mapped: SkyMap | undefined
  /** The field the sight is over, outlined. */
  current: string
}

/**
 * The whole sky as one chart (SSL-788): stars, the field grid, the fields already mapped and the landmarks to steer
 * by. The chart pans under a fixed sight, so the joystick can take the telescope to any point.
 */
export function SkyChart({ g, aim, mapped, current }: Props) {
  const { W, H } = g
  const raSpan = W / 2 / CHART_K
  const decSpan = H / CHART_K
  const decMin = Math.max(-90, aim.dec - decSpan - STAR_CELL)
  const decMax = Math.min(90, aim.dec + decSpan + STAR_CELL)

  const stars = useMemo(() => {
    const out: (Star & { x: number; y: number })[] = []
    const d0 = Math.floor(decMin / STAR_CELL)
    const d1 = Math.floor(decMax / STAR_CELL)
    const r0 = Math.floor((aim.ra - raSpan - STAR_CELL) / STAR_CELL)
    const r1 = Math.floor((aim.ra + raSpan + STAR_CELL) / STAR_CELL)
    for (let ri = r0; ri <= r1; ri++) {
      const wrapped = ((ri % (360 / STAR_CELL)) + 360 / STAR_CELL) % (360 / STAR_CELL)
      for (let di = d0; di <= d1; di++) {
        if (di < -90 / STAR_CELL || di >= 90 / STAR_CELL) continue
        for (const s of cellStars(wrapped, di)) {
          const p = project(aim, g, s.ra, s.dec)
          if (p.x > -2 && p.x < W + 2 && p.y > -2 && p.y < H + 2) out.push({ ...s, ...p })
        }
      }
    }
    return out
  }, [aim, g, W, H, raSpan, decMin, decMax])

  // Fields on screen: those whose centre is within the view plus half a field.
  const fields = useMemo(() => {
    const out: { id: string; x: number; y: number; w: number; h: number; mapped: boolean; current: boolean }[] = []
    const rIdx = Math.floor(wrapRa(aim.ra) / FIELD_DEG)
    const span = Math.ceil(raSpan / FIELD_DEG) + 1
    for (let dr = -span; dr <= span; dr++) {
      const ri = (((rIdx + dr) % RA_FIELDS) + RA_FIELDS) % RA_FIELDS
      for (let di = 0; di < DEC_FIELDS; di++) {
        const dec0 = di * FIELD_DEG - 90
        if (dec0 > aim.dec + decSpan + FIELD_DEG || dec0 + FIELD_DEG < aim.dec - decSpan - FIELD_DEG) continue
        const id = `${ri}_${di}`
        const p = project(aim, g, ri * FIELD_DEG + FIELD_DEG, dec0 + FIELD_DEG)
        out.push({ id, x: p.x, y: p.y, w: FIELD_DEG * CHART_K, h: FIELD_DEG * CHART_K, mapped: !!mapped?.[id], current: id === current })
      }
    }
    return out
  }, [aim, g, raSpan, decSpan, mapped, current])

  return (
    <g data-testid="sky-chart">
      {/* SSL-830: the same round cream and warm stars as the Control Station scope. */}
      {stars.map((s, i) => (
        <g key={i} opacity={s.o}>
          {s.big && <circle cx={s.x} cy={s.y} r={0.9} className={styles.chartGlow} />}
          <circle cx={s.x} cy={s.y} r={s.big ? 0.4 : s.size} className={styles.chartStar} data-warm={s.warm || undefined} />
        </g>
      ))}
      <g data-testid="sky-fields">
        {fields.map(f => (
          <rect key={f.id} x={f.x} y={f.y} width={f.w} height={f.h} className={styles.chartField} data-mapped={f.mapped || undefined} data-current={f.current || undefined} />
        ))}
      </g>
      {LANDMARKS.map(l => {
        const p = project(aim, g, l.ra, l.dec)
        if (p.x < 0 || p.x > W || p.y < 0 || p.y > H) return null
        return <path key={l.id} d={`M${p.x - 2} ${p.y}H${p.x - 0.8}M${p.x + 0.8} ${p.y}H${p.x + 2}M${p.x} ${p.y - 2}V${p.y - 0.8}M${p.x} ${p.y + 0.8}V${p.y + 2}`} className={styles.chartLandmark} />
      })}
    </g>
  )
}

export { fieldId }

/**
 * SSL-830: the whole sky at a glance, so the player can find their way and see their progress. Every field is a
 * cell (east to the left, north up, as on the chart); mapped cells are lit, the field under the sight is gold and the
 * box shows what is on screen. Tapping a cell swings the telescope there.
 */
export function SkyOverview({ aim, mapped, viewDeg, onJump }: { aim: SkyAim; mapped: SkyMap | undefined; viewDeg: { ra: number; dec: number }; onJump: (aim: SkyAim) => void }) {
  const current = fieldId(aim)
  const col = (ri: number) => RA_FIELDS - 1 - ri
  const row = (di: number) => DEC_FIELDS - 1 - di
  const cx = (360 - wrapRa(aim.ra)) / FIELD_DEG
  const cy = (90 - aim.dec) / FIELD_DEG
  const bw = Math.min(RA_FIELDS, viewDeg.ra / FIELD_DEG)
  const bh = Math.min(DEC_FIELDS, viewDeg.dec / FIELD_DEG)
  const count = mapped ? Object.keys(mapped).length : 0
  const jump = (event: React.PointerEvent<SVGSVGElement>) => {
    const r = event.currentTarget.getBoundingClientRect()
    const x = ((event.clientX - r.left) / r.width) * RA_FIELDS
    const y = ((event.clientY - r.top) / r.height) * DEC_FIELDS
    onJump({ ra: wrapRa(360 - x * FIELD_DEG), dec: Math.max(-89, Math.min(89, 90 - y * FIELD_DEG)) })
  }
  const cells: { id: string; x: number; y: number; on: boolean; here: boolean }[] = []
  for (let ri = 0; ri < RA_FIELDS; ri++) for (let di = 0; di < DEC_FIELDS; di++) {
    const id = `${ri}_${di}`
    cells.push({ id, x: col(ri), y: row(di), on: !!mapped?.[id], here: id === current })
  }
  // The on-screen box, drawn twice when it straddles the 0h line so it wraps like the sky does.
  const boxX = cx - bw / 2
  return (
    <div className={overviewStyles.overview} data-testid="sky-overview">
      <div className={overviewStyles.head}><span>Whole sky</span><b data-testid="sky-overview-count">{count} / {RA_FIELDS * DEC_FIELDS}</b></div>
      <svg viewBox={`0 0 ${RA_FIELDS} ${DEC_FIELDS}`} preserveAspectRatio="none" className={overviewStyles.map} role="img" aria-label={`Whole sky: ${count} of ${RA_FIELDS * DEC_FIELDS} fields mapped. Tap to steer there.`} onPointerDown={jump}>
        <path d={galacticPath()} className={overviewStyles.plane} />
        {cells.map(c => <rect key={c.id} x={c.x + 0.06} y={c.y + 0.06} width={0.88} height={0.88} className={overviewStyles.cell} data-mapped={c.on || undefined} data-here={c.here || undefined} />)}
        {[boxX, boxX - RA_FIELDS, boxX + RA_FIELDS].map((x, i) => <rect key={i} x={x} y={Math.max(0, cy - bh / 2)} width={bw} height={Math.min(DEC_FIELDS, cy + bh / 2) - Math.max(0, cy - bh / 2)} className={overviewStyles.box} />)}
      </svg>
    </div>
  )
}

/** The Milky Way's line across the overview, so the player can steer by it as on the chart. */
let plane: string | null = null
function galacticPath(): string {
  if (plane) return plane
  const pts: string[] = []
  for (let ra = 0; ra <= 360; ra += 6) {
    // The dec where galactic latitude is zero at this RA, found by a coarse scan.
    let best = 0, bestB = Infinity
    for (let dec = -90; dec <= 90; dec += 1) { const b = Math.abs(galacticLatitude({ ra, dec })); if (b < bestB) { bestB = b; best = dec } }
    pts.push(`${pts.length ? 'L' : 'M'}${((360 - ra) / FIELD_DEG).toFixed(2)} ${((90 - best) / FIELD_DEG).toFixed(2)}`)
  }
  plane = pts.join('')
  return plane
}
