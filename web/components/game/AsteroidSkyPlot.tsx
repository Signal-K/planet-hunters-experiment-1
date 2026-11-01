'use client'

// RA/Dec chart for the shared instrument viewport (KES-342, SSL-497).
// Every mark plots a field on AsteroidCandidate or real sky geometry (the ecliptic). There is no invented orbit.
// SSL-745: FIELD narrows the chart around the object (the grid refines as it narrows); GRID and
// ECLIPTIC switch their overlays. Labels and strokes keep their on-screen size at every field.
import viewportStyles from '@/components/game/instrument-viewport/InstrumentViewport.module.css'

interface AsteroidSkyPlotProps {
  tempDesig: string
  ra: number // hours, 0-24
  decl: number // degrees, -90..90
  vMag: number
  arcDays: number
  lastSeenDays: number
  /** Field magnification, 1 (whole sky) to 12. */
  field?: number
  showGrid?: boolean
  showEcliptic?: boolean
}

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n))
}

/** Plot area inside the 100×100 view box, leaving room for the axis labels. */
const L = 9
const T = 4
const W = 88
const H = 86
const px = (raHours: number) => L + clamp01(raHours / 24) * W
const py = (decDeg: number) => T + clamp01((90 - decDeg) / 180) * H

/** The ecliptic in equatorial coordinates: where the planets and most asteroids sit. */
const OBLIQUITY = (23.44 * Math.PI) / 180
const ECLIPTIC = Array.from({ length: 193 }, (_, i) => {
  const ra = (i / 192) * 24
  const dec = (Math.asin(Math.sin(OBLIQUITY) * Math.sin((ra / 24) * 2 * Math.PI)) * 180) / Math.PI
  return `${px(ra).toFixed(2)},${py(dec).toFixed(2)}`
}).join(' ')

/** Ecliptic latitude in degrees: how far off the planets' plane the object sits. */
export function eclipticLatitude(raHours: number, decDeg: number): number {
  const a = (raHours / 24) * 2 * Math.PI
  const d = (decDeg * Math.PI) / 180
  const s = Math.sin(d) * Math.cos(OBLIQUITY) - Math.cos(d) * Math.sin(OBLIQUITY) * Math.sin(a)
  return (Math.asin(Math.max(-1, Math.min(1, s))) * 180) / Math.PI
}

export const SKY_FIELD_LIMITS = { min: 1, max: 12 }

export default function AsteroidSkyPlot({ tempDesig, ra, decl, vMag, arcDays, lastSeenDays, field = 1, showGrid = true, showEcliptic = true }: AsteroidSkyPlotProps) {
  const x = px(ra)
  const y = py(decl)
  const f = Math.max(SKY_FIELD_LIMITS.min, Math.min(SKY_FIELD_LIMITS.max, field))
  const k = 1 / f // keeps text and strokes the same size on screen
  // The view box: centred on the object, kept inside the chart.
  const vw = 100 / f
  const vx = f === 1 ? 0 : Math.max(0, Math.min(100 - vw, x - vw / 2))
  const vy = f === 1 ? 0 : Math.max(0, Math.min(100 - vw, y - vw / 2))
  // Finer graticule as the field narrows.
  const raStep = f >= 6 ? 0.5 : f >= 3 ? 1 : f >= 1.5 ? 3 : 6
  const decStep = f >= 6 ? 5 : f >= 3 ? 10 : f >= 1.5 ? 15 : 45
  const raLines = Array.from({ length: Math.round(24 / raStep) + 1 }, (_, i) => i * raStep)
  const decLines = Array.from({ length: Math.round(180 / decStep) + 1 }, (_, i) => 90 - i * decStep)
  const inView = (vx0: number, vy0: number) => vx0 >= vx - 1 && vx0 <= vx + vw + 1 && vy0 >= vy - 1 && vy0 <= vy + vw + 1
  // Axis labels pinned to the view's edges.
  // Zoomed in, RA labels run just above the caption chip; DEC labels clear that row and the top edge.
  const labelY = f === 1 ? T + H + 5 : vy + vw - 8 * k
  const decLabelFits = (yy: number) => f === 1 || (yy > vy + 4 * k && Math.abs(yy - labelY) > 5 * k)
  const labelX = Math.max(L - 1.2 * k, vx + 7.5 * k)
  // Brighter (smaller V) reads as a bigger mark, within reason.
  const r = (1.4 + clamp01((23 - vMag) / 6) * 1.6) * Math.max(k, 0.35)
  // The name tag leans away from the nearest edge of the view so it never runs off the chart.
  const side = x - vx > vw * 0.64 ? -1 : 1
  const lift = y - vy < vw * 0.22 ? 1 : -1
  const fs = 3.3 * k

  return (
    <div className={viewportStyles.sky} data-testid="asteroid-sky-plot" data-field={f.toFixed(1)}>
      <svg viewBox={`${vx.toFixed(3)} ${vy.toFixed(3)} ${vw.toFixed(3)} ${vw.toFixed(3)}`} role="img" aria-label={`Sky position for ${tempDesig}: right ascension ${ra.toFixed(2)} hours, declination ${decl.toFixed(2)} degrees, V magnitude ${vMag.toFixed(1)}, arc ${arcDays.toFixed(2)} days, last seen ${lastSeenDays.toFixed(1)} days ago`}>
        <defs>
          <radialGradient id="neo-glow">
            <stop offset="0" stopColor="#7fe7ff" stopOpacity="0.9" />
            <stop offset="1" stopColor="#7fe7ff" stopOpacity="0" />
          </radialGradient>
        </defs>
        {showGrid && raLines.map(h => (
          <g key={`ra-${h}`}>
            <line x1={px(h)} y1={T} x2={px(h)} y2={T + H} stroke="#8fb4d8" strokeOpacity={h % 6 === 0 ? 0.3 : 0.16} strokeWidth={0.3 * k} />
            {inView(px(h), labelY) && <text x={px(h)} y={labelY} textAnchor="middle" fontSize={fs} fill="#a9c2dc">{Number.isInteger(h) ? `${h}h` : `${Math.floor(h)}h30`}</text>}
          </g>
        ))}
        {showGrid && decLines.map(d => (
          <g key={`dec-${d}`}>
            <line x1={L} y1={py(d)} x2={L + W} y2={py(d)} stroke="#8fb4d8" strokeOpacity={d === 0 ? 0.4 : 0.2} strokeWidth={(d === 0 ? 0.45 : 0.3) * k} />
            {inView(labelX, py(d)) && decLabelFits(py(d)) && <text x={labelX} y={py(d) + 1 * k} textAnchor="end" fontSize={fs} fill="#a9c2dc">{d > 0 ? `+${d}` : d}°</text>}
          </g>
        ))}
        {showEcliptic && (
          <g data-testid="asteroid-ecliptic">
            <polyline points={ECLIPTIC} fill="none" stroke="#f2b33d" strokeOpacity="0.75" strokeWidth={0.5 * k} strokeDasharray={`${1.6 * k} ${1.2 * k}`} />
            {f === 1 && <text x={px(6.4)} y={py(23.4) - 1.6} fontSize="2.8" fill="#f2b33d" fillOpacity="0.9" letterSpacing="0.3">ECLIPTIC</text>}
          </g>
        )}

        <circle cx={x} cy={y} r={r * 4} fill="url(#neo-glow)" opacity="0.55" data-testid="asteroid-mark-glow" />
        <circle cx={x} cy={y} r={r * 2.6} fill="none" stroke="#7fe7ff" strokeWidth={0.45 * k} strokeDasharray={`${k} ${k}`} />
        <circle cx={x} cy={y} r={r} fill="#eaffff" stroke="#2fb5d4" strokeWidth={0.6 * k} />
        <line x1={x + side * r * 2.6} y1={y + lift * r * 2.6} x2={x + side * (r * 2.6 + 4 * k)} y2={y + lift * (r * 2.6 + 4 * k)} stroke="#7fe7ff" strokeWidth={0.35 * k} />
        <text x={x + side * (r * 2.6 + 4.6 * k)} y={y + lift * (r * 2.6 + 4.4 * k) + (lift > 0 ? 2.4 * k : 0)} textAnchor={side > 0 ? 'start' : 'end'} fontSize={3.2 * k} fill="#eaffff" fontWeight="700" letterSpacing={0.2 * k}>{tempDesig}</text>
      </svg>
    </div>
  )
}
