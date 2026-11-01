'use client'

// RA/Dec chart for the shared instrument viewport (KES-342, SSL-497).
// Every mark plots a field on AsteroidCandidate or real sky geometry (the ecliptic). There is no invented orbit.
import viewportStyles from '@/components/game/instrument-viewport/InstrumentViewport.module.css'

interface AsteroidSkyPlotProps {
  tempDesig: string
  ra: number // hours, 0-24
  decl: number // degrees, -90..90
  vMag: number
  arcDays: number
  lastSeenDays: number
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
const ECLIPTIC = Array.from({ length: 49 }, (_, i) => {
  const ra = (i / 48) * 24
  const dec = (Math.asin(Math.sin(OBLIQUITY) * Math.sin((ra / 24) * 2 * Math.PI)) * 180) / Math.PI
  return `${px(ra).toFixed(2)},${py(dec).toFixed(2)}`
}).join(' ')

export default function AsteroidSkyPlot({ tempDesig, ra, decl, vMag, arcDays, lastSeenDays }: AsteroidSkyPlotProps) {
  const x = px(ra)
  const y = py(decl)
  // Brighter (smaller V) reads as a bigger mark, within reason.
  const r = 1.4 + clamp01((23 - vMag) / 6) * 1.6
  // The name tag leans away from the nearest edge so it never runs off the chart.
  const side = x > 64 ? -1 : 1
  const lift = y < 22 ? 1 : -1

  return (
    <div className={viewportStyles.sky} data-testid="asteroid-sky-plot">
      <svg viewBox="0 0 100 100" role="img" aria-label={`Sky position for ${tempDesig}: right ascension ${ra.toFixed(2)} hours, declination ${decl.toFixed(2)} degrees, V magnitude ${vMag.toFixed(1)}, arc ${arcDays.toFixed(2)} days, last seen ${lastSeenDays.toFixed(1)} days ago`}>
        <defs>
          <radialGradient id="neo-glow">
            <stop offset="0" stopColor="#7fe7ff" stopOpacity="0.9" />
            <stop offset="1" stopColor="#7fe7ff" stopOpacity="0" />
          </radialGradient>
        </defs>
        {[0, 6, 12, 18, 24].map(h => (
          <g key={`ra-${h}`}>
            <line x1={px(h)} y1={T} x2={px(h)} y2={T + H} stroke="#8fb4d8" strokeOpacity="0.22" strokeWidth="0.3" />
            <text x={px(h)} y={T + H + 5} textAnchor="middle" fontSize="3.4" fill="#a9c2dc">{h}h</text>
          </g>
        ))}
        {[90, 45, 0, -45, -90].map(d => (
          <g key={`dec-${d}`}>
            <line x1={L} y1={py(d)} x2={L + W} y2={py(d)} stroke="#8fb4d8" strokeOpacity={d === 0 ? 0.4 : 0.22} strokeWidth={d === 0 ? 0.45 : 0.3} />
            <text x={L - 1.2} y={py(d) + 1} textAnchor="end" fontSize="3.4" fill="#a9c2dc">{d > 0 ? `+${d}` : d}°</text>
          </g>
        ))}
        <polyline points={ECLIPTIC} fill="none" stroke="#f2b33d" strokeOpacity="0.75" strokeWidth="0.5" strokeDasharray="1.6 1.2" />
        <text x={px(6.4)} y={py(23.4) - 1.6} fontSize="2.8" fill="#f2b33d" fillOpacity="0.9" letterSpacing="0.3">ECLIPTIC</text>

        <circle cx={x} cy={y} r={r * 4} fill="url(#neo-glow)" opacity="0.55" data-testid="asteroid-mark-glow" />
        <circle cx={x} cy={y} r={r * 2.6} fill="none" stroke="#7fe7ff" strokeWidth="0.45" strokeDasharray="1 1" />
        <circle cx={x} cy={y} r={r} fill="#eaffff" stroke="#2fb5d4" strokeWidth="0.6" />
        <line x1={x + side * r * 2.6} y1={y + lift * r * 2.6} x2={x + side * (r * 2.6 + 4)} y2={y + lift * (r * 2.6 + 4)} stroke="#7fe7ff" strokeWidth="0.35" />
        <text x={x + side * (r * 2.6 + 4.6)} y={y + lift * (r * 2.6 + 4.4) + (lift > 0 ? 2.4 : 0)} textAnchor={side > 0 ? 'start' : 'end'} fontSize="3.2" fill="#eaffff" fontWeight="700" letterSpacing="0.2">{tempDesig}</text>
      </svg>
    </div>
  )
}
