'use client'

import { useMemo } from 'react'
import { DEC_FIELDS, FIELD_DEG, LANDMARKS, RA_FIELDS, fieldId, galacticLatitude, raDelta, wrapRa, type SkyAim, type SkyMap } from '@/lib/research/sky-map'
import type { Geom } from './SkyScenes'
import styles from './SkyPointing.module.css'

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

interface Star { ra: number; dec: number; big: boolean; tone: string; o: number }

const TONES = ['#ffffff', '#dbe8ff', '#cfe0ff', '#ffe7bd', '#ffd29a']

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
    tone: TONES[Math.floor(r() * TONES.length)],
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
    <g data-testid="sky-chart" shapeRendering="crispEdges">
      {stars.map((s, i) => (
        <g key={i} fill={s.tone} opacity={s.o}>
          <rect x={Math.round(s.x)} y={Math.round(s.y)} width="1" height="1" />
          {s.big && <><rect x={Math.round(s.x) - 1} y={Math.round(s.y)} width="1" height="1" /><rect x={Math.round(s.x) + 1} y={Math.round(s.y)} width="1" height="1" /><rect x={Math.round(s.x)} y={Math.round(s.y) - 1} width="1" height="1" /><rect x={Math.round(s.x)} y={Math.round(s.y) + 1} width="1" height="1" /></>}
        </g>
      ))}
      <g data-testid="sky-fields">
        {fields.map(f => (
          <rect key={f.id} x={f.x} y={f.y} width={f.w} height={f.h} className={styles.field} data-mapped={f.mapped || undefined} data-current={f.current || undefined} />
        ))}
      </g>
      {LANDMARKS.map(l => {
        const p = project(aim, g, l.ra, l.dec)
        if (p.x < 0 || p.x > W || p.y < 0 || p.y > H) return null
        return <path key={l.id} d={`M${p.x - 2} ${p.y}H${p.x - 0.8}M${p.x + 0.8} ${p.y}H${p.x + 2}M${p.x} ${p.y - 2}V${p.y - 0.8}M${p.x} ${p.y + 0.8}V${p.y + 2}`} className={styles.landmark} />
      })}
    </g>
  )
}

export { fieldId }
