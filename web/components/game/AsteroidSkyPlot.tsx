'use client'

// Truthful candidate visualization for Asteroid Discovery (KES-342). Every
// mark plots a real field already present on `AsteroidCandidate` — right
// ascension, declination, V magnitude, observation arc, and days since last
// seen — each labeled with its literal value beside the graphic. There is no
// orbit, trajectory, or image cutout: the source feed (MPC NEOCP) doesn't
// supply one, and inventing one would violate the "truthful graphics" /
// "no fabricated scientific geometry" requirement.
interface AsteroidSkyPlotProps {
  tempDesig: string
  ra: number // hours, 0-24
  decl: number // degrees, -90..90
  vMag: number
  arcDays: number
  lastSeenDays: number
}

// Typical NEOCP magnitude spread — used only to scale the brightness bar's
// fill, never displayed as a claim about the object itself (the literal
// vMag value is always shown alongside it).
const VMAG_BRIGHT = 14
const VMAG_FAINT = 25
const ARC_SCALE_DAYS = 5

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n))
}

export default function AsteroidSkyPlot({ tempDesig, ra, decl, vMag, arcDays, lastSeenDays }: AsteroidSkyPlotProps) {
  const x = clamp01(ra / 24) * 100
  const y = clamp01((90 - decl) / 180) * 100
  const brightnessFraction = clamp01(1 - (vMag - VMAG_BRIGHT) / (VMAG_FAINT - VMAG_BRIGHT))
  const arcFraction = clamp01(arcDays / ARC_SCALE_DAYS)
  const recencyFraction = clamp01(1 - lastSeenDays / ARC_SCALE_DAYS)

  return (
    <div data-testid="asteroid-sky-plot" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{
        fontFamily: 'var(--ln-font-mono)', fontSize: 8, letterSpacing: '0.08em', color: 'var(--ln-text-dim)',
        textTransform: 'uppercase',
      }}>
        Sky position — schematic, not to scale
      </div>
      <svg viewBox="0 0 100 60" preserveAspectRatio="none" role="img" aria-label={`Sky position for ${tempDesig}: right ascension ${ra.toFixed(2)} hours, declination ${decl.toFixed(2)} degrees`} style={{ width: '100%', height: 84, display: 'block' }}>
        <rect x="0" y="0" width="100" height="60" fill="rgba(112,217,234,0.05)" stroke="var(--ln-hairline-strong)" strokeWidth="0.5" />
        {[0, 25, 50, 75, 100].map(px => (
          <line key={`v-${px}`} x1={px} y1={0} x2={px} y2={60} stroke="var(--ln-hairline)" strokeWidth="0.3" />
        ))}
        {[0, 15, 30, 45, 60].map(py => (
          <line key={`h-${py}`} x1={0} y1={py} x2={100} y2={py} stroke="var(--ln-hairline)" strokeWidth="0.3" />
        ))}
        <circle cx={x} cy={y * 0.6} r={2.4} fill="var(--ln-amber-bright)" stroke="var(--ln-amber)" strokeWidth="0.6" />
        <text x={2} y={5} fontSize="4" fill="var(--ln-text-dim)" fontFamily="var(--ln-font-mono)">RA 0h</text>
        <text x={80} y={5} fontSize="4" fill="var(--ln-text-dim)" fontFamily="var(--ln-font-mono)">RA 24h</text>
        <text x={2} y={57} fontSize="4" fill="var(--ln-text-dim)" fontFamily="var(--ln-font-mono)">DEC −90°</text>
        <text x={70} y={57} fontSize="4" fill="var(--ln-text-dim)" fontFamily="var(--ln-font-mono)">DEC +90°</text>
      </svg>
      <div style={{ fontFamily: 'var(--ln-font-mono)', fontSize: 10, color: 'var(--ln-text-dim)' }}>
        RA {ra.toFixed(4)}h · DEC {decl.toFixed(4)}°
      </div>
      <MeterRow label="Brightness (V mag)" value={vMag.toFixed(1)} fraction={brightnessFraction} />
      <MeterRow label="Observation arc" value={`${arcDays.toFixed(2)}d`} fraction={arcFraction} />
      <MeterRow label="Last seen" value={`${lastSeenDays.toFixed(1)}d ago`} fraction={recencyFraction} />
    </div>
  )
}

function MeterRow({ label, value, fraction }: { label: string; value: string; fraction: number }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--ln-font-mono)', fontSize: 9, color: 'var(--ln-text-muted)', textTransform: 'uppercase' }}>
        <span>{label}</span>
        <span>{value}</span>
      </div>
      <div style={{ height: 4, borderRadius: 2, background: 'var(--ln-hairline)', overflow: 'hidden' }}>
        <div style={{ width: `${fraction * 100}%`, height: '100%', background: 'var(--ln-cyan)' }} />
      </div>
    </div>
  )
}
