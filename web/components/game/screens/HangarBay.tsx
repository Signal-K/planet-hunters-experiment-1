/** The assembly bay as vector art in the base kit's palette: back wall, ceiling truss, two gantry towers and the
 *  floor. The rocket is drawn only when a vehicle is actually staged; an empty bay shows an empty cradle. */

interface HangarBayProps {
  /** Tier of the staged vehicle (1 to 3), or null when nothing is in the bay. */
  stagedTier: number | null
}

const WALL_BANDS = Array.from({ length: 17 }, (_, i) => i * 100)

function Gantry({ x, flip }: { x: number; flip?: boolean }) {
  const dir = flip ? -1 : 1
  const rails = [0, 70]
  return (
    <g transform={`translate(${x} 0)`}>
      {rails.map(r => <rect key={r} x={r} y="150" width="14" height="560" fill="var(--ln-world-asphalt)" stroke="var(--ln-world-outline)" strokeWidth="3" />)}
      {Array.from({ length: 8 }, (_, i) => {
        const y = 164 + i * 68
        return (
          <g key={i} stroke="var(--ln-world-outline)" strokeWidth="5" strokeLinecap="round">
            <path d={`M14 ${y} L70 ${y + 68}`} />
            <path d={`M70 ${y} L14 ${y + 68}`} />
            <path d={`M0 ${y} h84`} strokeWidth="6" />
          </g>
        )
      })}
      {[300, 470, 600].map(y => (
        <g key={y} transform={`translate(${flip ? 84 : 0} ${y}) scale(${dir} 1)`}>
          <rect x="84" y="0" width="110" height="18" fill="var(--ln-world-hull-lit)" stroke="var(--ln-world-outline)" strokeWidth="3" />
          <rect x="176" y="-4" width="18" height="26" fill="var(--ln-world-trim-blue)" stroke="var(--ln-world-outline)" strokeWidth="3" />
        </g>
      ))}
      <rect x="-8" y="140" width="100" height="22" fill="var(--ln-world-trim-blue)" stroke="var(--ln-world-outline)" strokeWidth="3" />
    </g>
  )
}

function Rocket({ tier }: { tier: number }) {
  const booster = (x: number, scale: number) => (
    <g transform={`translate(${x} 0)`}>
      <path d={`M0 ${360 - 40 * scale} q18 -${50 * scale} 36 0 v${290 + 40 * scale - 0} h-36 z`} fill="var(--ln-world-hull-lit)" stroke="var(--ln-world-outline)" strokeWidth="4" strokeLinejoin="round" />
      <rect x="0" y="470" width="36" height="22" fill="var(--ln-world-trim-blue)" stroke="var(--ln-world-outline)" strokeWidth="3" />
      <path d="M4 650 h28 l6 24 h-40 z" fill="var(--ln-world-asphalt)" stroke="var(--ln-world-outline)" strokeWidth="3" />
    </g>
  )
  return (
    <g data-testid="hangar-staged-rocket">
      {tier >= 2 && booster(724, tier >= 3 ? 1.3 : 1)}
      {tier >= 2 && booster(840, tier >= 3 ? 1.3 : 1)}
      <path d="M770 208 q30 -150 60 0 v440 h-60 z" fill="var(--ln-world-hull-lit)" stroke="var(--ln-world-outline)" strokeWidth="4" strokeLinejoin="round" />
      <path d="M770 300 h60 v26 h-60 z" fill="var(--ln-world-trim-blue)" stroke="var(--ln-world-outline)" strokeWidth="3" />
      <path d="M770 560 h60 v22 h-60 z" fill="var(--ln-world-trim-blue)" stroke="var(--ln-world-outline)" strokeWidth="3" />
      <circle cx="800" cy="248" r="13" fill="var(--ln-world-glass)" stroke="var(--ln-world-outline)" strokeWidth="3" />
      <path d="M770 600 l-34 62 l34 -14 z M830 600 l34 62 l-34 -14 z" fill="var(--ln-world-trim-blue)" stroke="var(--ln-world-outline)" strokeWidth="3" strokeLinejoin="round" />
      <path d="M778 648 h44 l10 30 h-64 z" fill="var(--ln-world-asphalt)" stroke="var(--ln-world-outline)" strokeWidth="3" />
    </g>
  )
}

export default function HangarBay({ stagedTier }: HangarBayProps) {
  return (
    <svg
      data-testid="hangar-bay-art"
      data-staged={stagedTier ? 'true' : 'false'}
      viewBox="0 0 1600 900"
      preserveAspectRatio="xMidYMax slice"
      aria-hidden="true"
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', display: 'block' }}
    >
      <defs>
        <linearGradient id="hangar-wall" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="color-mix(in srgb, var(--ln-world-outline) 78%, var(--ln-world-trim-blue))" />
          <stop offset="1" stopColor="color-mix(in srgb, var(--ln-world-outline) 40%, var(--ln-world-trim-blue))" />
        </linearGradient>
        <radialGradient id="hangar-glow" cx="0.5" cy="0.15" r="0.6">
          <stop offset="0" stopColor="var(--ln-world-glass)" stopOpacity="0.5" />
          <stop offset="1" stopColor="var(--ln-world-glass)" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="1600" height="900" fill="url(#hangar-wall)" />
      {WALL_BANDS.map(x => <rect key={x} x={x} y="110" width="2" height="590" fill="var(--ln-world-outline)" opacity="0.45" />)}
      {[0, 400, 800, 1200].map(x => <rect key={x} x={x + 20} y="190" width="360" height="26" fill="var(--ln-world-trim-blue)" opacity="0.45" />)}
      <rect width="1600" height="900" fill="url(#hangar-glow)" />
      <rect y="0" width="1600" height="120" fill="var(--ln-world-asphalt)" stroke="var(--ln-world-outline)" strokeWidth="4" />
      {Array.from({ length: 20 }, (_, i) => (
        <g key={i} stroke="var(--ln-world-outline)" strokeWidth="4" opacity="0.8">
          <path d={`M${i * 90} 0 L${i * 90 + 90} 120`} />
          <path d={`M${i * 90 + 90} 0 L${i * 90} 120`} />
        </g>
      ))}
      {[260, 600, 1000, 1340].map(x => <rect key={x} x={x} y="120" width="90" height="12" rx="6" fill="var(--ln-world-glass)" />)}
      <Gantry x={470} />
      <Gantry x={1046} flip />
      <path d="M0 700 H1600 V900 H0 z" fill="color-mix(in srgb, var(--ln-world-asphalt) 85%, var(--ln-world-outline))" stroke="var(--ln-world-outline)" strokeWidth="4" />
      <path d="M560 700 L420 900 M1040 700 L1180 900 M800 700 V900" stroke="var(--ln-world-hull-lit)" strokeWidth="5" opacity="0.5" />
      <rect x="700" y="676" width="200" height="30" fill="var(--ln-world-hull-lit)" stroke="var(--ln-world-outline)" strokeWidth="4" />
      <rect x="720" y="684" width="160" height="8" fill="var(--ln-world-trim-blue)" />
      {stagedTier ? <Rocket tier={stagedTier} /> : null}
    </svg>
  )
}
