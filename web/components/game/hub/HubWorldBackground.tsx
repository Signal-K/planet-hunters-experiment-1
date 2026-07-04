'use client'

import React, { useMemo } from 'react'

// ── Coordinate space matches the PixiJS portrait canvas ──────────────────────
// SVG viewBox="0 0 402 874" + preserveAspectRatio="none" lets this fill any
// viewport shape non-uniformly, so mountains and terrain stretch edge-to-edge
// on both portrait and landscape screens.
const W = 402
const H = 874
const GY = H * 0.78          // GROUND_Y ≈ 681.7
const GRASS_TOP   = GY - 20
const SUBSOIL_TOP = GY + 82
const BEDROCK_TOP = GY + 152

// ── Polygon generators (same algorithm as hubScene.ts) ────────────────────────
function ridgePts(yPeak: number, sines: [number, number, number][]): string {
  const STEPS = 220
  const totalAmp = sines.reduce((s, [a]) => s + a, 0)
  const pts: string[] = []
  for (let i = 0; i <= STEPS; i++) {
    const t = i / STEPS
    let h = 0
    for (const [amp, freq, phase] of sines) h += amp * Math.sin(t * Math.PI * 2 * freq + phase)
    const norm = Math.max(0, Math.min(1, (h / totalAmp + 1) / 2))
    pts.push(`${(t * W).toFixed(1)},${(GY - norm * (GY - yPeak)).toFixed(1)}`)
  }
  pts.push(`${W},${GY}`, `0,${GY}`)
  return pts.join(' ')
}

function treePts(yTop: number, seed: number): string {
  const STEPS = 240
  const span = GY - yTop
  const pts: string[] = []
  for (let i = 0; i <= STEPS; i++) {
    const t = i / STEPS
    const raw =
      0.42 * Math.sin(t * Math.PI * 11  + seed + 0.30) +
      0.24 * Math.sin(t * Math.PI * 25  + seed + 1.10) +
      0.16 * Math.sin(t * Math.PI * 48  + seed + 0.75) +
      0.10 * Math.sin(t * Math.PI * 80  + seed + 1.90) +
      0.05 * Math.sin(t * Math.PI * 130 + seed + 0.50) +
      0.03 * Math.sin(t * Math.PI * 200 + seed + 2.30)
    const h = Math.max(0.10, Math.min(1, (raw + 1) / 2))
    pts.push(`${(t * W).toFixed(1)},${(GY - h * span).toFixed(1)}`)
  }
  pts.push(`${W},${GY}`, `0,${GY}`)
  return pts.join(' ')
}

// ── Angled stratum boundary: a polygon that looks like a tilted geological cut.
// Produces a thin wedge shape at the top of a layer, breaking the flat line.
// pts: array of [x,y] tracing the irregular top edge of the transition zone.
function stratumEdge(yBase: number, offsets: number[]): string {
  const step = W / (offsets.length - 1)
  const top = offsets.map((dy, i) => `${(i * step).toFixed(1)},${(yBase + dy).toFixed(1)}`).join(' ')
  return `${top} ${W},${yBase + 10} 0,${yBase + 10}`
}

export function HubWorldBackground() {
  // useMemo so polygons are computed once — they're deterministic constants
  const mt1 = useMemo(() => ridgePts(GY - 360, [[0.30, 1.1, 0.20], [0.28, 2.3, 0.80], [0.22, 3.8, 1.50], [0.12, 5.9, 0.40], [0.08, 8.2, 1.20]]), [])
  const mt2 = useMemo(() => ridgePts(GY - 310, [[0.35, 1.6, 0.60], [0.28, 3.2, 1.30], [0.20, 5.5, 0.20], [0.12, 8.0, 1.90], [0.05, 12.0, 0.80]]), [])
  const mt3 = useMemo(() => ridgePts(GY - 250, [[0.40, 2.2, 1.10], [0.27, 4.1, 0.50], [0.18, 7.0, 1.70], [0.10, 10.5, 0.30], [0.05, 15.0, 2.10]]), [])
  const mt4 = useMemo(() => ridgePts(GY - 190, [[0.44, 2.8, 0.40], [0.28, 5.2, 1.80], [0.16, 8.6, 0.60], [0.08, 13.0, 2.40], [0.04, 19.0, 0.90]]), [])
  const mt5 = useMemo(() => ridgePts(GY - 130, [[0.46, 3.5, 1.60], [0.26, 6.8, 0.20], [0.16, 11.0, 1.40], [0.08, 16.5, 0.80], [0.04, 24.0, 1.10]]), [])
  const tr1 = useMemo(() => treePts(GY - 108, 0.0), [])
  const tr2 = useMemo(() => treePts(GY - 78,  1.3), [])
  const tr3 = useMemo(() => treePts(GY - 50,  2.7), [])

  // Irregular transition edges between soil horizons (slight geological tilt + lumps)
  const soilEdge    = useMemo(() => stratumEdge(SUBSOIL_TOP, [ 0, -3,  2, -1,  4, -2,  1,  3, -1,  2,  0]), [])
  const bedrockEdge = useMemo(() => stratumEdge(BEDROCK_TOP, [ 2, -4,  1,  3, -2,  0,  5, -3,  2, -1,  0]), [])

  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 1 }}>

      {/* ── Rayleigh scattering sky gradient ─────────────────────────────── */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'linear-gradient(180deg,#04080e 0%,#060d1e 6%,#0c2248 16%,#184a80 32%,#2870a8 50%,#4898c4 66%,#78bad8 80%,#aad8ec 91%,#c8e8f8 97%,#d0ecf8 100%)',
      }} />

      {/* ── Terrain SVG — stretches non-uniformly to fill any viewport ──── */}
      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', display: 'block' }}
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="hwb-grass" x1="0" y1={GRASS_TOP} x2="0" y2={GY + 1} gradientUnits="userSpaceOnUse">
            <stop offset="0%"   stopColor="#64b044" />
            <stop offset="40%"  stopColor="#4e9834" />
            <stop offset="100%" stopColor="#386020" />
          </linearGradient>
          <linearGradient id="hwb-soil" x1="0" y1={GY + 4} x2="0" y2={SUBSOIL_TOP} gradientUnits="userSpaceOnUse">
            <stop offset="0%"   stopColor="#2e1e0a" />
            <stop offset="20%"  stopColor="#3e2a10" />
            <stop offset="55%"  stopColor="#4a3318" />
            <stop offset="80%"  stopColor="#3e2c12" />
            <stop offset="100%" stopColor="#30200c" />
          </linearGradient>
          <linearGradient id="hwb-sub" x1="0" y1={SUBSOIL_TOP} x2="0" y2={BEDROCK_TOP} gradientUnits="userSpaceOnUse">
            <stop offset="0%"   stopColor="#2a180a" />
            <stop offset="25%"  stopColor="#38180a" />
            <stop offset="50%"  stopColor="#40160a" />
            <stop offset="75%"  stopColor="#301206" />
            <stop offset="100%" stopColor="#1e0c04" />
          </linearGradient>
          <linearGradient id="hwb-bed" x1="0" y1={BEDROCK_TOP} x2="0" y2={H} gradientUnits="userSpaceOnUse">
            <stop offset="0%"   stopColor="#14100a" />
            <stop offset="35%"  stopColor="#100c08" />
            <stop offset="70%"  stopColor="#0c0a06" />
            <stop offset="100%" stopColor="#080604" />
          </linearGradient>
          <linearGradient id="hwb-glow" x1="0" y1={GY - 300} x2="0" y2={GY - 180} gradientUnits="userSpaceOnUse">
            <stop offset="0%"   stopColor="#e8a030" stopOpacity="0" />
            <stop offset="50%"  stopColor="#e8a030" stopOpacity="0.09" />
            <stop offset="100%" stopColor="#ffc060" stopOpacity="0.12" />
          </linearGradient>
          {/* Left cliff face — triangular shadow wedge */}
          <linearGradient id="hwb-cliff-l" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%"  stopColor="#000" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#000" stopOpacity="0" />
          </linearGradient>
          {/* Right cliff face — triangular shadow wedge */}
          <linearGradient id="hwb-cliff-r" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%"  stopColor="#000" stopOpacity="0" />
            <stop offset="100%" stopColor="#000" stopOpacity="0.35" />
          </linearGradient>
        </defs>

        {/* Horizon glow band */}
        <rect x="0" y={GY - 300} width={W} height="120" fill="url(#hwb-glow)" />

        {/* Mountain ranges — atmospheric perspective (distant = blue, near = green) */}
        <polygon points={mt1} fill="#8aaec8" />
        <polygon points={mt2} fill="#6a8ea8" />
        <polygon points={mt3} fill="#4e6e7c" />
        <polygon points={mt4} fill="#3c5c44" />
        <polygon points={mt5} fill="#2a4430" />

        {/* Treeline — three depth rows */}
        <polygon points={tr1} fill="#1a3018" />
        <polygon points={tr2} fill="#254a22" />
        <polygon points={tr3} fill="#346830" />

        {/* Grass strip */}
        <rect x="0" y={GRASS_TOP} width={W} height={GY - GRASS_TOP + 1} fill="url(#hwb-grass)" />

        {/* Ground contact shadow */}
        <rect x="0" y={GY} width={W} height="4" fill="#0e0804" />

        {/* ── SUBSURFACE CROSS-SECTION ──────────────────────────────────── */}

        {/* Topsoil A horizon */}
        <rect x="0" y={GY + 4} width={W} height={SUBSOIL_TOP - GY - 4} fill="url(#hwb-soil)" />

        {/* Root network threads */}
        {([
          [15,  12, 55, 1.5], [88,  22, 38, 1], [168,  8, 62, 1.5], [248, 30, 45, 1],
          [310, 18, 40, 1.5], [365, 28, 32, 1], [50,  44, 42, 1],   [148, 50, 35, 1.5],
          [235, 42, 50, 1],   [320, 56, 38, 1], [72,  62, 28, 1.5], [192, 68, 45, 1],
          [285, 60, 36, 1],   [380, 48, 20, 1.5],
        ] as [number,number,number,number][]).map(([rx, ry, rw, rh], i) => (
          <rect key={`r${i}`} x={rx} y={GY + 4 + ry} width={rw} height={rh} fill="#160b04" fillOpacity="0.48" />
        ))}

        {/* Embedded stones */}
        {([
          [38,  20, 10, 5], [95,  36,  7, 3], [162, 14, 12, 6], [232, 42,  8, 4],
          [292, 24, 10, 5], [352, 50,  7, 3], [384, 12, 11, 5], [68,  58,  8, 4],
          [178, 66, 10, 5], [318, 62,  7, 3], [132, 32,  6, 3], [268, 46,  9, 4],
          [116, 72,  5, 2], [200, 24,  7, 3], [344, 32,  6, 3], [58,  40,  9, 4],
        ] as [number,number,number,number][]).map(([rx, ry, rw, rh], i) => (
          <ellipse key={`s${i}`} cx={rx} cy={GY + 4 + ry} rx={rw} ry={rh} fill="#1e1008" fillOpacity="0.60" />
        ))}

        {/* A→B horizon boundary: irregular angled cut + thin dark seam */}
        <polygon points={soilEdge} fill="#1e0c06" fillOpacity="0.7" />
        <line x1="0" y1={SUBSOIL_TOP} x2={W} y2={SUBSOIL_TOP - 3} stroke="#120804" strokeWidth="1.5" strokeOpacity="0.6" />

        {/* Left-edge cliff triangle over A→B boundary (rocky protrusion, left side) */}
        <polygon points={`0,${SUBSOIL_TOP - 14} 28,${SUBSOIL_TOP} 0,${SUBSOIL_TOP}`} fill="#2e1c0a" />
        <polygon points={`0,${SUBSOIL_TOP - 8}  14,${SUBSOIL_TOP} 0,${SUBSOIL_TOP}`} fill="#1a0e06" fillOpacity="0.6" />

        {/* Right-edge cliff triangle over A→B boundary */}
        <polygon points={`${W},${SUBSOIL_TOP - 10} ${W-22},${SUBSOIL_TOP} ${W},${SUBSOIL_TOP}`} fill="#2e1c0a" />

        {/* Subsoil B horizon (iron/clay) */}
        <rect x="0" y={SUBSOIL_TOP + 10} width={W} height={BEDROCK_TOP - SUBSOIL_TOP - 10} fill="url(#hwb-sub)" />

        {/* Fe-oxide nodules */}
        {([
          [55, 10, 7, 4], [142, 22, 5, 3], [228, 8, 8, 4], [316, 18, 6, 3],
          [88, 34, 9, 4], [186, 28, 6, 3], [280, 32, 8, 4], [370, 14, 7, 3],
          [120, 44, 5, 2], [240, 40, 7, 3], [340, 36, 6, 3],
        ] as [number,number,number,number][]).map(([rx, ry, rw, rh], i) => (
          <ellipse key={`n${i}`} cx={rx} cy={SUBSOIL_TOP + 14 + ry} rx={rw} ry={rh} fill="#4a0e04" fillOpacity="0.52" />
        ))}

        {/* Angular rock shards in subsoil — triangular inclusions */}
        {([
          [60,  28, 16, 8,  10], [180, 38, 12, 7,  8 ], [290, 22, 18, 9,  12],
          [130, 52, 10, 6,  7 ], [240, 58, 14, 8,  10], [360, 42, 12, 7,  8 ],
        ] as [number,number,number,number,number][]).map(([rx, ry, bw, bh, tip], i) => (
          <polygon key={`sh${i}`}
            points={`${rx},${SUBSOIL_TOP + 14 + ry} ${rx + bw},${SUBSOIL_TOP + 14 + ry} ${rx + bw/2},${SUBSOIL_TOP + 14 + ry - tip}`}
            fill="#1e0c04" fillOpacity="0.45"
          />
        ))}

        {/* B→C horizon boundary: angled geological cut */}
        <polygon points={bedrockEdge} fill="#100c08" fillOpacity="0.75" />
        <line x1="0" y1={BEDROCK_TOP + 2} x2={W} y2={BEDROCK_TOP - 1} stroke="#080604" strokeWidth="2" strokeOpacity="0.5" />

        {/* Left cliff corner wedge at B→C boundary */}
        <polygon points={`0,${BEDROCK_TOP - 18} 36,${BEDROCK_TOP} 0,${BEDROCK_TOP}`} fill="#1e1208" />
        <polygon points={`0,${BEDROCK_TOP - 10} 18,${BEDROCK_TOP} 0,${BEDROCK_TOP}`} fill="#0c0808" fillOpacity="0.7" />

        {/* Right cliff corner wedge at B→C boundary */}
        <polygon points={`${W},${BEDROCK_TOP - 14} ${W-30},${BEDROCK_TOP} ${W},${BEDROCK_TOP}`} fill="#1e1208" />
        <polygon points={`${W},${BEDROCK_TOP - 8}  ${W-16},${BEDROCK_TOP} ${W},${BEDROCK_TOP}`} fill="#0c0808" fillOpacity="0.7" />

        {/* Bedrock C horizon */}
        <rect x="0" y={BEDROCK_TOP + 10} width={W} height={H - BEDROCK_TOP - 10} fill="url(#hwb-bed)" />

        {/* Bedrock fracture lines — angled, not just horizontal */}
        {([
          [30,  4, 22, 28, -6], [108,  8, 14, 22, 4],  [195, 2, 24, 32, -8],
          [268, 10, 18, 24, 5], [355,  6, 16, 22, -5],  [78, 20, 12, 18, 3],
          [228, 18, 18, 26, -4],[318, 14, 14, 20, 6],
        ] as [number,number,number,number,number][]).map(([rx, ry, rw, rh, tilt], i) => (
          <polygon key={`c${i}`}
            points={`${rx},${BEDROCK_TOP + 10 + ry} ${rx+rw},${BEDROCK_TOP + 10 + ry + tilt} ${rx+rw},${BEDROCK_TOP + 10 + ry + rh + tilt} ${rx},${BEDROCK_TOP + 10 + ry + rh}`}
            fill="#040302" fillOpacity="0.30"
          />
        ))}

        {/* Left and right edge cliff-face shadow triangles (full subsurface depth) */}
        <polygon
          points={`0,${GY} 24,${GY} 0,${H}`}
          fill="url(#hwb-cliff-l)"
        />
        <polygon
          points={`${W},${GY} ${W-24},${GY} ${W},${H}`}
          fill="url(#hwb-cliff-r)"
        />
      </svg>
    </div>
  )
}
