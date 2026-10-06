'use client'

// RA/Dec chart for the shared instrument viewport (KES-342, SSL-497).
// Every mark plots a field on AsteroidCandidate. There is no invented orbit.
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

export default function AsteroidSkyPlot({ tempDesig, ra, decl, vMag, arcDays, lastSeenDays }: AsteroidSkyPlotProps) {
  const x = clamp01(ra / 24) * 100
  const y = clamp01((90 - decl) / 180) * 100

  return (
    <div className={viewportStyles.sky} data-testid="asteroid-sky-plot">
      <svg viewBox="0 0 100 100" role="img" aria-label={`Sky position for ${tempDesig}: right ascension ${ra.toFixed(2)} hours, declination ${decl.toFixed(2)} degrees, V magnitude ${vMag.toFixed(1)}, arc ${arcDays.toFixed(2)} days, last seen ${lastSeenDays.toFixed(1)} days ago`}>
        {[0, 25, 50, 75, 100].map(px => (
          <line key={`v-${px}`} x1={px} y1={0} x2={px} y2={100} stroke="var(--ln-bp-paper, var(--ln-panel))" strokeOpacity="0.28" strokeWidth="0.4" />
        ))}
        {[0, 25, 50, 75, 100].map(py => (
          <line key={`h-${py}`} x1={0} y1={py} x2={100} y2={py} stroke="var(--ln-bp-paper, var(--ln-panel))" strokeOpacity="0.28" strokeWidth="0.4" />
        ))}
        <circle cx={x} cy={y} r="2.2" fill="var(--ln-bp-paper, var(--ln-panel))" stroke="var(--ln-bp-blue, var(--ln-cyan))" strokeWidth="0.8" />
      </svg>
    </div>
  )
}
