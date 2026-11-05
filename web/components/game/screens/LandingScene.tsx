'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { paletteForTarget } from '@/lib/mining/laserPalette'
import { hex, groundColor, skyColor } from '@/lib/mining/destinationVista'
import type { LandingSequenceMode } from '@/lib/engine/scripts/LandingController'

interface Props {
  target: { id: string; type: string; archetype?: string | null }
  progress: number
  mode: LandingSequenceMode
}

function rng(seed0: number) {
  let seed = seed0
  return () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647 }
}
function hashId(id: string) {
  let h = 7
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) % 2147483000
  return h + 1
}
const lerp = (a: number, b: number, t: number) => a + (b - a) * t
const ease = (t: number) => t * t * (3 - 2 * t)

/**
 * Descent and ascent seen from beside the lander. Altitude runs from 1 (orbit)
 * to 0 (surface). Near orbit the body is a curved limb below; as altitude falls
 * the limb flattens into a plain with craters, rocks and a landing pad, and the
 * orbiter you left climbs away. Ascent plays the same picture in reverse.
 */
export default function LandingScene({ target, progress, mode }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState({ w: 160, h: 100 })
  const [tick, setTick] = useState(0)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const read = () => setSize({ w: Math.max(120, el.clientWidth), h: Math.max(80, el.clientHeight) })
    read()
    const ro = new ResizeObserver(read)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  useEffect(() => {
    const id = window.setInterval(() => setTick(t => t + 1), 90)
    return () => window.clearInterval(id)
  }, [])

  const H = 100
  const W = (size.w / size.h) * 100
  const pal = useMemo(() => paletteForTarget(target), [target])
  const seed = useMemo(() => hashId(target.id), [target.id])
  const alt = mode === 'descend' ? 1 - progress : progress
  const low = 1 - ease(alt) // 0 in orbit, 1 on the surface

  const sky = hex(skyColor(pal.skyTop))
  const horizon = hex(skyColor(pal.skyHorizon))
  const ground = hex(groundColor(hex(pal.ground)))
  const deep = hex(pal.groundDeep)
  const ridge = hex(pal.nearRidge)
  const far = hex(pal.distant)

  const stars = useMemo(() => {
    const r = rng(seed)
    return Array.from({ length: 90 }, () => ({ x: r() * 200 - 20, y: r() * 80, s: 0.12 + r() * 0.3, o: 0.35 + r() * 0.6 }))
  }, [seed])
  const craters = useMemo(() => {
    const r = rng(seed + 11)
    return Array.from({ length: 16 }, () => ({ x: r(), d: r(), s: 0.4 + r() * 1.2 }))
  }, [seed])
  const rocks = useMemo(() => {
    const r = rng(seed + 23)
    return Array.from({ length: 26 }, () => ({ x: r(), d: r(), s: 0.5 + r() * 1.3, k: r() }))
  }, [seed])

  // The body: a circle whose curvature relaxes as the lander descends.
  const R = lerp(W * 0.62, W * 7, low)
  const limbY = lerp(H * 0.8, H * 0.7, low)
  const cx = W / 2
  const cy = limbY + R
  const groundY = H * 0.78

  // Lander position.
  const padX = W * 0.56
  const landerY = lerp(H * 0.2, groundY - 3, ease(1 - alt))
  const scale = lerp(0.8, 1.35, low)
  const burning = mode === 'descend' ? progress < 0.985 : progress > 0.02
  const flick = 0.75 + 0.25 * Math.sin(tick * 1.9)
  const legs = lerp(0, 1, Math.min(1, Math.max(0, (low - 0.45) / 0.35)))
  const dust = Math.max(0, (low - 0.82) / 0.18)

  // Orbiter rides away overhead.
  const orbX = lerp(padX - 4, padX - 26, low)
  const orbY = lerp(landerY - 13, -14, ease(low))
  const orbA = Math.max(0, 1 - low * 1.25)

  return (
    <div ref={ref} style={{ width: '100%', height: '100%' }}>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="100%" preserveAspectRatio="xMidYMid slice" role="img" aria-label={mode === 'descend' ? 'Lander descending to the surface' : 'Lander climbing to orbit'} data-testid="landing-canvas" style={{ display: 'block' }}>
        <defs>
          <linearGradient id="ls-sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#02060d" />
            <stop offset={0.55} stopColor={sky} />
            <stop offset="1" stopColor={horizon} />
          </linearGradient>
          <linearGradient id="ls-ground" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={ground} />
            <stop offset="1" stopColor={deep} />
          </linearGradient>
          <radialGradient id="ls-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0" stopColor="#ffd9a0" stopOpacity="0.95" />
            <stop offset="0.5" stopColor="#ff8a3c" stopOpacity="0.5" />
            <stop offset="1" stopColor="#ff8a3c" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="ls-atmo" cx="50%" cy="100%" r="80%">
            <stop offset="0" stopColor={horizon} stopOpacity="0.55" />
            <stop offset="1" stopColor={horizon} stopOpacity="0" />
          </radialGradient>
          <filter id="ls-tex" x="0" y="0" width="100%" height="100%">
            <feTurbulence type="fractalNoise" baseFrequency="0.05 0.12" numOctaves="3" seed={seed % 90} result="n" />
            <feColorMatrix in="n" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1.1 -0.35" result="a" />
            <feComposite in="SourceGraphic" in2="a" operator="in" />
          </filter>
          <filter id="ls-blur"><feGaussianBlur stdDeviation="1.1" /></filter>
          <clipPath id="ls-body"><circle cx={cx} cy={cy} r={R} /></clipPath>
        </defs>

        <rect width={W} height={H} fill="url(#ls-sky)" />
        {stars.map((s, i) => <circle key={i} cx={s.x * (W / 160)} cy={s.y} r={s.s} fill="#fff" opacity={s.o * (1 - low * 0.55)} />)}
        <rect width={W} height={H} fill="url(#ls-atmo)" opacity={0.5 * low} />

        {/* The body */}
        <circle cx={cx} cy={cy} r={R + 1.2} fill={horizon} opacity={0.35 * (1 - low)} filter="url(#ls-blur)" />
        <g clipPath="url(#ls-body)">
          <rect x={0} y={limbY - 2} width={W} height={H} fill="url(#ls-ground)" />
          <rect x={0} y={limbY - 2} width={W} height={H} fill={far} filter="url(#ls-tex)" opacity="0.5" />
          {/* distant ridges */}
          <path d={`M0 ${limbY + 2}${Array.from({ length: 14 }, (_, i) => `L${(i + 1) * (W / 13)} ${limbY + 2 - 2.5 * Math.abs(Math.sin(i * 1.7 + seed)) * low}`).join('')}L${W} ${limbY + 8}L0 ${limbY + 8}Z`} fill={ridge} opacity={0.65 * low} />
          {/* craters, growing as you drop */}
          {craters.map((c, i) => {
            const y = limbY + 6 + c.d * (H - limbY - 6)
            const persp = 0.35 + (y - limbY) / (H - limbY)
            const rx = c.s * 3.2 * persp * lerp(0.5, 2.2, low)
            return <ellipse key={i} cx={c.x * W} cy={y} rx={rx} ry={rx * 0.28} fill={deep} opacity={0.55} stroke={ridge} strokeWidth="0.25" />
          })}
          {/* rocks only read near the ground */}
          {rocks.map((r, i) => {
            const y = groundY - 2 + r.d * (H - groundY + 2)
            const sz = r.s * (0.8 + (y - groundY) * 0.12) * low
            return sz > 0.25 ? <path key={i} d={`M${r.x * W - sz * 1.4} ${y}L${r.x * W - sz * 0.5} ${y - sz}L${r.x * W + sz} ${y - sz * 0.7}L${r.x * W + sz * 1.5} ${y}Z`} fill={r.k > 0.5 ? ridge : deep} opacity="0.9" /> : null
          })}
        </g>
        <circle cx={cx} cy={cy} r={R} fill="none" stroke={horizon} strokeWidth="0.35" opacity={0.7 * (1 - low * 0.6)} />

        {/* Landing pad: a ring that opens up as the ground comes close. */}
        <g opacity={Math.min(1, low * 1.6)}>
          <ellipse cx={padX} cy={groundY + 2} rx={lerp(6, 15, low)} ry={lerp(1.4, 3.2, low)} fill="none" stroke="#70d9ea" strokeWidth="0.45" strokeDasharray="1.6 1.2" />
          <ellipse cx={padX} cy={groundY + 2} rx={lerp(2, 5, low)} ry={lerp(0.5, 1.1, low)} fill="#70d9ea" opacity="0.25" />
        </g>

        {/* Orbiter */}
        <g transform={`translate(${orbX} ${orbY})`} opacity={orbA}>
          <rect x={-5} y={-2.2} width={10} height={4.4} rx={0.8} fill="#cfd8e4" stroke="#8fa0b4" strokeWidth="0.3" />
          <rect x={-13} y={-1} width={7} height={2} fill="#2f6fa8" stroke="#8ec5f0" strokeWidth="0.2" />
          <rect x={6} y={-1} width={7} height={2} fill="#2f6fa8" stroke="#8ec5f0" strokeWidth="0.2" />
          <circle cx={0} cy={0} r={1.1} fill="#0b1522" />
        </g>
        <line x1={padX} y1={landerY - 6} x2={orbX} y2={orbY + 3} stroke="#70d9ea" strokeWidth="0.25" strokeDasharray="1 1.4" opacity={0.5 * orbA} />

        {/* Dust thrown up near touchdown */}
        {dust > 0 && Array.from({ length: 9 }, (_, i) => {
          const dir = i % 2 ? 1 : -1
          const spread = (i + 1) * 2.2 * dust
          return <ellipse key={i} cx={padX + dir * spread} cy={groundY + 1.5 - (i % 3) * 0.8} rx={2 + i * 0.5} ry={0.9 + (i % 3) * 0.3} fill="#d9cdb8" opacity={0.28 * dust * (1 - i / 11)} filter="url(#ls-blur)" />
        })}

        {/* Lander */}
        <g transform={`translate(${padX} ${landerY}) scale(${scale})`}>
          {burning && <>
            <ellipse cx={0} cy={5.5} rx={4.5 * flick} ry={7 * flick} fill="url(#ls-glow)" />
            <path d={`M-1.3 3.6L0 ${5 + 9 * flick}L1.3 3.6Z`} fill="#ffe9bf" opacity="0.9" />
          </>}
          <g stroke="#8fa0b4" strokeWidth="0.45" strokeLinecap="round" opacity={0.4 + 0.6 * legs}>
            <line x1={-2.6} y1={2.4} x2={-2.6 - 3.4 * legs} y2={2.4 + 3.1 * legs} />
            <line x1={2.6} y1={2.4} x2={2.6 + 3.4 * legs} y2={2.4 + 3.1 * legs} />
            <line x1={-2.6 - 3.4 * legs - 1} y1={2.4 + 3.1 * legs} x2={-2.6 - 3.4 * legs + 1} y2={2.4 + 3.1 * legs} />
            <line x1={2.6 + 3.4 * legs - 1} y1={2.4 + 3.1 * legs} x2={2.6 + 3.4 * legs + 1} y2={2.4 + 3.1 * legs} />
          </g>
          <path d="M-3 2.8L-3.6 -1L-1.8 -3.6L1.8 -3.6L3.6 -1L3 2.8Z" fill="#dde4ee" stroke="#8fa0b4" strokeWidth="0.35" />
          <path d="M-3.6 -1L3.6 -1" stroke="#9fb0c4" strokeWidth="0.3" />
          <circle cx={0} cy={-1.2} r={1.15} fill="#13324d" stroke="#70d9ea" strokeWidth="0.3" />
          <rect x={-1.5} y={2.2} width={3} height={1.1} rx={0.3} fill="#47576b" />
        </g>
        {/* Shadow under the lander */}
        <ellipse cx={padX + 2} cy={groundY + 3} rx={lerp(1, 5, low)} ry={lerp(0.2, 0.9, low)} fill="#000" opacity={0.3 * low} />

        {/* Altitude gauge */}
        <g transform={`translate(5 ${H * 0.2})`}>
          <line x1={0} y1={0} x2={0} y2={H * 0.58} stroke="#70d9ea" strokeWidth="0.3" opacity="0.5" />
          {Array.from({ length: 11 }, (_, i) => <line key={i} x1={0} y1={(i / 10) * H * 0.58} x2={i % 5 === 0 ? 2.2 : 1.2} y2={(i / 10) * H * 0.58} stroke="#70d9ea" strokeWidth="0.3" opacity="0.6" />)}
          <path d={`M-0.6 ${(1 - alt) * H * 0.58 - 1.2}L2.8 ${(1 - alt) * H * 0.58}L-0.6 ${(1 - alt) * H * 0.58 + 1.2}Z`} fill="#70d9ea" />
        </g>
      </svg>
    </div>
  )
}
