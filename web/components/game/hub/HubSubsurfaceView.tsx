'use client'

/**
 * Full-screen underground cross-section shown when subsurface mode is active.
 * Three strata (A=topsoil, B=subsoil, C=bedrock) fill the viewport top-to-bottom.
 */
const W = 402
const H = 874

const A_H = H * 0.30   // topsoil   (top 30%)
const B_H = H * 0.38   // subsoil   (next 38%)
const B_TOP = A_H
const C_TOP = A_H + B_H // bedrock   (bottom 32%)

export function HubSubsurfaceView() {
  return (
    <div style={{ position: 'absolute', inset: 0, background: '#1a0e06' }}>
      <svg
        width="100%" height="100%"
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        style={{ position: 'absolute', inset: 0, display: 'block' }}
      >
        <defs>
          {/* Topsoil */}
          <linearGradient id="sub-soil-a" x1="0" y1="0" x2="0" y2={A_H} gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#3b1f0e"/>
            <stop offset="100%" stopColor="#2a1408"/>
          </linearGradient>
          {/* Subsoil */}
          <linearGradient id="sub-soil-b" x1="0" y1={B_TOP} x2="0" y2={C_TOP} gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#2a1408"/>
            <stop offset="100%" stopColor="#1e0c06"/>
          </linearGradient>
          {/* Bedrock */}
          <linearGradient id="sub-soil-c" x1="0" y1={C_TOP} x2="0" y2={H} gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#1e1008"/>
            <stop offset="100%" stopColor="#0c0806"/>
          </linearGradient>
        </defs>

        {/* ── A Horizon — topsoil ─────────────────────────────────────── */}
        <rect x="0" y="0" width={W} height={A_H} fill="url(#sub-soil-a)"/>

        {/* Root network */}
        {([
          [40, 4, 80, 2],   [160, 8, 60, 1.5], [270, 2, 90, 2],  [350, 12, 45, 1.5],
          [100, 50, 55, 1], [220, 40, 70, 1.5], [310, 60, 38, 1], [60, 80, 45, 1],
          [180, 90, 65, 1], [290, 70, 50, 1.5], [380, 55, 20, 1], [25, 100, 40, 1.5],
          [140, 120, 55, 1],[240, 110, 70, 1],  [370, 90, 30, 1.5],
        ] as [number,number,number,number][]).map(([x,y,w,h], i) => (
          <rect key={`ra${i}`} x={x} y={y} width={w} height={h} fill="#160b04" fillOpacity="0.5"/>
        ))}

        {/* Embedded stones */}
        {([
          [55, 28, 14, 7], [130, 52, 10, 5], [210, 18, 16, 8], [300, 64, 12, 6],
          [370, 38, 11, 5], [82, 90, 9, 4],  [185, 108, 13, 6],[275, 95, 10, 5],
          [45, 140, 8, 4],  [168, 82, 11, 5],[340, 118, 9, 4], [22, 60, 7, 3],
        ] as [number,number,number,number][]).map(([cx,cy,rx,ry], i) => (
          <ellipse key={`sa${i}`} cx={cx} cy={cy} rx={rx} ry={ry} fill="#1e1008" fillOpacity="0.65"/>
        ))}

        {/* Iron (Fe) ore deposits — orange-red, near topsoil */}
        {([
          [78, 68, 9], [162, 88, 7], [298, 44, 8], [358, 110, 7], [120, 140, 6],
        ] as [number,number,number][]).map(([cx,cy,r], i) => (
          <g key={`fea${i}`}>
            <circle cx={cx} cy={cy} r={r*1.8} fill="#d97150" fillOpacity="0.12"/>
            <circle cx={cx} cy={cy} r={r} fill="#d97150" fillOpacity="0.9"/>
            <circle cx={cx-r*0.3} cy={cy-r*0.3} r={r*0.35} fill="#ff9a78" fillOpacity="0.7"/>
          </g>
        ))}

        {/* Strata boundary A→B */}
        <rect x="0" y={A_H - 2} width={W} height="4" fill="#120804" fillOpacity="0.8"/>
        <path d={`M0,${A_H} Q100,${A_H - 5} 200,${A_H + 3} T${W},${A_H}`} stroke="#ff9a7822" strokeWidth="1" fill="none"/>

        {/* Stratum label A */}
        <text x="14" y="22" fontFamily="monospace" fontSize="9" letterSpacing="2" fill="#9c8d70" fillOpacity="0.7" textAnchor="start" style={{ textTransform: 'uppercase' }}>A · TOPSOIL</text>

        {/* ── B Horizon — subsoil / iron-clay ────────────────────────── */}
        <rect x="0" y={B_TOP} width={W} height={B_H} fill="url(#sub-soil-b)"/>

        {/* Fe-oxide nodules */}
        {([
          [48, 18, 10, 5], [140, 28, 8, 4],  [222, 14, 11, 5], [308, 32, 9, 4],
          [375, 20, 8, 4],  [86, 52, 9, 4],  [185, 44, 12, 5], [270, 58, 8, 4],
          [55, 82, 11, 5],  [168, 72, 9, 4], [340, 68, 10, 4], [400, 48, 7, 3],
          [22, 38, 8, 3],   [248, 82, 8, 4], [128, 96, 10, 4], [310, 100, 9, 4],
        ] as [number,number,number,number][]).map(([cx,cy,rx,ry], i) => (
          <ellipse key={`nb${i}`} cx={cx} cy={B_TOP + cy} rx={rx} ry={ry} fill="#4a0e04" fillOpacity="0.55"/>
        ))}

        {/* Angular rock shards */}
        {([
          [55, 22, 22, 11, 14], [175, 36, 18, 9, 12], [288, 18, 24, 12, 16],
          [128, 58, 16, 8, 10], [238, 66, 18, 9, 12], [360, 44, 16, 8, 10],
          [72, 94, 14, 7, 9],   [200, 88, 20, 10, 13],[330, 80, 16, 8, 11],
          [42, 128, 18, 9, 12], [162, 120, 14, 7, 9], [280, 112, 20, 10, 13],
        ] as [number,number,number,number,number][]).map(([rx,ry,bw,bh,tip], i) => (
          <polygon key={`shb${i}`}
            points={`${rx},${B_TOP+ry} ${rx+bw},${B_TOP+ry} ${rx+bw/2},${B_TOP+ry-tip}`}
            fill="#1e0c04" fillOpacity="0.5"
          />
        ))}

        {/* Silicon (Si) deposits — blue-white, in subsoil */}
        {([
          [92, 38, 8], [230, 56, 7], [340, 30, 8], [170, 100, 7], [58, 120, 6],
          [300, 116, 7],
        ] as [number,number,number][]).map(([cx,cy,r], i) => (
          <g key={`sib${i}`}>
            <circle cx={cx} cy={B_TOP+cy} r={r*1.8} fill="#b9d8ff" fillOpacity="0.10"/>
            <circle cx={cx} cy={B_TOP+cy} r={r}     fill="#b9d8ff" fillOpacity="0.88"/>
            <circle cx={cx-r*0.3} cy={B_TOP+cy-r*0.3} r={r*0.35} fill="#e0f0ff" fillOpacity="0.7"/>
          </g>
        ))}

        {/* Nickel (Ni) deposits — green-gray, subsoil deep */}
        {([
          [145, 128, 7], [275, 140, 8], [390, 120, 6],
        ] as [number,number,number][]).map(([cx,cy,r], i) => (
          <g key={`nib${i}`}>
            <circle cx={cx} cy={B_TOP+cy} r={r*1.8} fill="#7fc98d" fillOpacity="0.10"/>
            <circle cx={cx} cy={B_TOP+cy} r={r}     fill="#7fc98d" fillOpacity="0.85"/>
            <circle cx={cx-r*0.3} cy={B_TOP+cy-r*0.3} r={r*0.35} fill="#b8f0c4" fillOpacity="0.7"/>
          </g>
        ))}

        {/* Strata boundary B→C */}
        <rect x="0" y={C_TOP - 2} width={W} height="4" fill="#080604" fillOpacity="0.9"/>
        <polygon points={`0,${C_TOP-18} 36,${C_TOP} 0,${C_TOP}`} fill="#1e1208"/>
        <polygon points={`${W},${C_TOP-14} ${W-28},${C_TOP} ${W},${C_TOP}`} fill="#1e1208"/>

        {/* Stratum label B */}
        <text x="14" y={B_TOP + 18} fontFamily="monospace" fontSize="9" letterSpacing="2" fill="#9c8d70" fillOpacity="0.7" textAnchor="start">B · SUBSOIL</text>

        {/* ── C Horizon — bedrock ─────────────────────────────────────── */}
        <rect x="0" y={C_TOP} width={W} height={H - C_TOP} fill="url(#sub-soil-c)"/>

        {/* Fracture lines */}
        {([
          [28, 6, 24, 32, -8], [110, 10, 18, 26, 5],  [200, 4, 28, 36, -10],
          [275, 12, 22, 28, 6],[360, 8, 18, 24, -6],  [75, 22, 16, 22, 4],
          [175, 28, 22, 30, -5],[320, 18, 18, 24, 7],  [48, 50, 14, 20, -4],
          [140, 58, 20, 28, 5],[250, 52, 16, 22, -6], [380, 44, 12, 18, 4],
          [92, 90, 18, 24, -7],[220, 88, 22, 30, 5],  [345, 80, 16, 22, -5],
        ] as [number,number,number,number,number][]).map(([rx,ry,rw,rh,tilt], i) => (
          <polygon key={`fc${i}`}
            points={`${rx},${C_TOP+ry} ${rx+rw},${C_TOP+ry+tilt} ${rx+rw},${C_TOP+ry+rh+tilt} ${rx},${C_TOP+ry+rh}`}
            fill="#040302" fillOpacity="0.35"
          />
        ))}

        {/* Gold (Au) deposits — amber, deep in bedrock */}
        {([
          [68, 40, 6], [195, 60, 7], [322, 45, 6], [138, 110, 5], [280, 100, 7],
        ] as [number,number,number][]).map(([cx,cy,r], i) => (
          <g key={`auc${i}`}>
            <circle cx={cx} cy={C_TOP+cy} r={r*2}   fill="#ffd166" fillOpacity="0.09"/>
            <circle cx={cx} cy={C_TOP+cy} r={r}     fill="#ffd166" fillOpacity="0.85"/>
            <circle cx={cx-r*0.3} cy={C_TOP+cy-r*0.3} r={r*0.4} fill="#fff0b0" fillOpacity="0.8"/>
          </g>
        ))}

        {/* Cobalt (Co) deposits — blue-purple, bedrock */}
        {([
          [152, 80, 7], [300, 70, 6], [45, 130, 5], [240, 130, 7],
        ] as [number,number,number][]).map(([cx,cy,r], i) => (
          <g key={`coc${i}`}>
            <circle cx={cx} cy={C_TOP+cy} r={r*1.8} fill="#8080ff" fillOpacity="0.10"/>
            <circle cx={cx} cy={C_TOP+cy} r={r}     fill="#8080ff" fillOpacity="0.85"/>
            <circle cx={cx-r*0.3} cy={C_TOP+cy-r*0.3} r={r*0.35} fill="#c0c0ff" fillOpacity="0.7"/>
          </g>
        ))}

        {/* Stratum label C */}
        <text x="14" y={C_TOP + 18} fontFamily="monospace" fontSize="9" letterSpacing="2" fill="#9c8d70" fillOpacity="0.7" textAnchor="start">C · BEDROCK</text>
      </svg>

      {/* Depth ruler on right edge */}
      <div style={{
        position: 'absolute', right: 0, top: 0, bottom: 0,
        width: 28, display: 'flex', flexDirection: 'column',
        borderLeft: '1px solid rgba(122,80,40,0.25)',
      }}>
        {[0, 25, 50, 75, 100].map(pct => (
          <div key={pct} style={{
            position: 'absolute',
            top: `${pct}%`,
            right: 4,
            fontFamily: 'monospace', fontSize: 8,
            letterSpacing: '0.1em', color: '#9c8d70',
            opacity: 0.6,
          }}>{pct === 0 ? '0m' : `${pct * 4}m`}</div>
        ))}
      </div>
    </div>
  )
}
