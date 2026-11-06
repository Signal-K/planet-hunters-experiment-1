'use client'

import styles from './LandingScene.module.css'
import { useEffect, useMemo, useRef, useState } from 'react'
import TakeOnMount from '@/components/takeon/TakeOnMount'
import { takeonBodyForTarget } from '@/lib/takeon/bodies'
import { terrainLookForTarget, type TerrainLook } from '@/lib/takeon/terrainColour'
import type { LandingSequenceMode } from '@/lib/engine/scripts/LandingController'
import type { Target } from '@/lib/data'

interface Props {
  target: Target
  progress: number
  mode: LandingSequenceMode
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t
const ease = (t: number) => t * t * (3 - 2 * t)
const clamp01 = (t: number) => Math.min(1, Math.max(0, t))

function rng(seed0: number) {
  let seed = seed0
  return () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647 }
}

/**
 * Descent and ascent over the destination's own Takeon landscape. Takeon draws
 * the ground (read-only, the same world the rovers later work on); this layer
 * adds the star field, the lander with its plume and dust, the landing ring and
 * the orbiter. Altitude runs from 1 (orbit: the world is a small, hazy diorama
 * in space) to 0 (surface: the field fills the view). No rover is passed, so
 * Takeon draws none: a landing has no vehicle on the ground yet.
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
  const alt = mode === 'descend' ? 1 - progress : progress
  const low = 1 - ease(alt)

  const look = useMemo<TerrainLook | null>(() => {
    try { return terrainLookForTarget(target) } catch { return null }
  }, [target])
  const ground = look?.ground ?? ['#8a7967', '#675b4f', '#4a4037']
  const atmo = look?.atmosphere ?? 'none'
  const craters = useMemo(() => {
    const r = rng(target.id.length * 977 + 13)
    return Array.from({ length: 26 }, () => ({ a: r() * Math.PI, d: 0.1 + r() * 0.85, s: 0.7 + r() * 2.4 }))
  }, [target.id])

  const stars = useMemo(() => {
    const r = rng(41)
    return Array.from({ length: 110 }, () => ({ x: r(), y: r(), s: 0.12 + r() * 0.3, o: 0.35 + r() * 0.6 }))
  }, [])

  const padX = W * 0.5
  const padY = H * 0.66
  const topPad = size.h > size.w ? H * 0.32 : H * 0.2
  const starK = Math.min(1, 428 / Math.max(1, size.h))
  const ladderH = size.h > size.w ? H * 0.42 : H * 0.58
  const landerY = lerp(topPad, padY - 4, ease(1 - alt))
  const scale = lerp(0.8, 1.3, low)
  const burning = mode === 'descend' ? progress < 0.985 : progress > 0.02
  const flick = 0.75 + 0.25 * Math.sin(tick * 1.9)
  const legs = Math.min(1, Math.max(0, (low - 0.45) / 0.35))
  const dust = Math.max(0, (low - 0.82) / 0.18)
  const orbX = padX
  const orbY = lerp(landerY - 13, -14, ease(low))
  const orbA = Math.max(0, 1 - low * 1.25)

  // The world below: its limb rises and flattens as the lander drops, then the
  // field fades in over it so the hand-off to the ground is never a hard edge.
  const t = ease(clamp01(low / 0.78))
  const limbY = lerp(H * 0.8, H * 0.3, t)
  const limbR = lerp(95, 1400, t * t)
  const limbX = W / 2
  const worldOpacity = 1 - clamp01((low - 0.82) / 0.16)
  const fieldOpacity = clamp01((low - 0.5) / 0.35)
  const fieldReach = lerp(34, 112, ease(clamp01((low - 0.45) / 0.55)))
  const mask = `radial-gradient(ellipse ${fieldReach}% ${fieldReach * 0.86}% at 50% 64%, #000 52%, transparent 100%)`
  const heat = atmo === 'none' ? 0 : Math.sin(Math.PI * clamp01((low - 0.18) / 0.5))
  const glowRim = atmo === 'none' ? 0 : lerp(1, 0.25, t)

  return (
    <div ref={ref} style={{ position: 'absolute', inset: 0, overflow: 'hidden', background: '#02040b' }}>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="100%" preserveAspectRatio="xMidYMid slice" aria-hidden="true" style={{ position: 'absolute', inset: 0 }}>
        {stars.map((s, i) => <circle key={i} cx={s.x * W} cy={s.y * H} r={s.s * starK} fill="#fff" opacity={s.o} />)}
      </svg>

      <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="100%" preserveAspectRatio="xMidYMid slice" aria-hidden="true" shapeRendering="crispEdges" data-testid="landing-world" style={{ position: 'absolute', inset: 0, opacity: worldOpacity }}>
        <defs>
          <clipPath id="ls-limb"><circle cx={limbX} cy={limbY + limbR} r={limbR} /></clipPath>
          <radialGradient id="ls-heat" cx="50%" cy="50%" r="50%">
            <stop offset="0" stopColor="#ffb870" stopOpacity="0.8" />
            <stop offset="0.6" stopColor="#ff7a30" stopOpacity="0.25" />
            <stop offset="1" stopColor="#ff7a30" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="ls-air" x1="0" y1="1" x2="0" y2="0">
            <stop offset="0" stopColor={look?.sky ?? '#9fd6e4'} stopOpacity="0.7" />
            <stop offset="1" stopColor={look?.sky ?? '#9fd6e4'} stopOpacity="0" />
          </linearGradient>
        </defs>
        {glowRim > 0 && <circle cx={limbX} cy={limbY + limbR} r={limbR + 3} fill="none" stroke="url(#ls-air)" strokeWidth={6} opacity={glowRim} />}
        <circle cx={limbX} cy={limbY + limbR} r={limbR} fill={ground[2]} />
        <g clipPath="url(#ls-limb)">
          <circle cx={limbX - limbR * 0.16} cy={limbY + limbR + limbR * 0.06} r={limbR * 0.96} fill={ground[1]} />
          <circle cx={limbX - limbR * 0.3} cy={limbY + limbR + limbR * 0.14} r={limbR * 0.86} fill={ground[0]} />
          {craters.map((c, i) => {
            const cx = limbX + Math.cos(c.a) * limbR * 0.55 * (c.d * 2 - 1) * (limbR > 200 ? 0.5 : 1)
            const cy = limbY + 4 + c.d * Math.min(limbR * 0.3, H * 0.5)
            return <ellipse key={i} cx={cx} cy={cy} rx={c.s * lerp(1, 4, t)} ry={c.s * lerp(0.7, 1.6, t)} fill={ground[2]} opacity={0.55 * (1 - clamp01((low - 0.55) / 0.3))} />
          })}
        </g>
        {heat > 0 && <ellipse cx={padX} cy={landerY + 4} rx={16 * heat} ry={22 * heat} fill="url(#ls-heat)" opacity={0.5 * heat} />}
      </svg>

      <div style={{ position: 'absolute', inset: 0, transform: `scale(${lerp(0.82, 1.08, low)})`, transformOrigin: '50% 64%', opacity: fieldOpacity, WebkitMaskImage: mask, maskImage: mask, pointerEvents: 'none' }}>
        <TakeOnMount
          missionId={`landing-${target.id}`}
          bodyId={takeonBodyForTarget(target)}
          startView="iso"
          readOnly
          className={styles.field}
        />
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="100%" preserveAspectRatio="xMidYMid slice" role="img" aria-label={mode === 'descend' ? 'Lander descending to the surface' : 'Lander climbing to orbit'} data-testid="landing-canvas" style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
        <defs>
          <radialGradient id="ls-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0" stopColor="#ffd9a0" stopOpacity="0.95" />
            <stop offset="0.5" stopColor="#ff8a3c" stopOpacity="0.5" />
            <stop offset="1" stopColor="#ff8a3c" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="ls-hull" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#97a6bb" />
            <stop offset="0.28" stopColor="#f3f7fc" />
            <stop offset="0.55" stopColor="#d2dbe7" />
            <stop offset="1" stopColor="#7a8aa1" />
          </linearGradient>
          <linearGradient id="ls-shade" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0.5" stopColor="#000" stopOpacity="0" />
            <stop offset="1" stopColor="#000" stopOpacity="0.4" />
          </linearGradient>
          <radialGradient id="ls-glass" cx="40%" cy="35%" r="70%">
            <stop offset="0" stopColor="#3e86b8" />
            <stop offset="1" stopColor="#0b1d33" />
          </radialGradient>
          <filter id="ls-blur"><feGaussianBlur stdDeviation="1.1" /></filter>
        </defs>

        <g opacity={fieldOpacity}>
          <ellipse cx={padX} cy={padY + 2} rx={lerp(6, 15, low)} ry={lerp(1.4, 3.2, low)} fill="none" stroke="#70d9ea" strokeWidth="0.45" strokeDasharray="1.6 1.2" />
          <ellipse cx={padX} cy={padY + 2} rx={lerp(2, 5, low)} ry={lerp(0.5, 1.1, low)} fill="#70d9ea" opacity="0.25" />
        </g>

        <g transform={`translate(${orbX} ${orbY})`} opacity={orbA}>
          <rect x={-5} y={-2.2} width={10} height={4.4} rx={0.8} fill="#cfd8e4" stroke="#8fa0b4" strokeWidth="0.3" />
          <rect x={-13} y={-1} width={7} height={2} fill="#2f6fa8" stroke="#8ec5f0" strokeWidth="0.2" />
          <rect x={6} y={-1} width={7} height={2} fill="#2f6fa8" stroke="#8ec5f0" strokeWidth="0.2" />
          <circle cx={0} cy={0} r={1.1} fill="#0b1522" />
        </g>
        <line x1={padX} y1={landerY - 6} x2={orbX} y2={orbY + 3} stroke="#70d9ea" strokeWidth="0.25" strokeDasharray="1 1.4" opacity={0.5 * orbA} />

        {dust > 0 && Array.from({ length: 9 }, (_, i) => {
          const dir = i % 2 ? 1 : -1
          return <ellipse key={i} cx={padX + dir * (i + 1) * 2.2 * dust} cy={padY + 1.5 - (i % 3) * 0.8} rx={2 + i * 0.5} ry={0.9 + (i % 3) * 0.3} fill="#d9cdb8" opacity={0.3 * dust * (1 - i / 11)} filter="url(#ls-blur)" />
        })}

        <ellipse cx={padX + 2} cy={padY + 3} rx={lerp(1, 5, low)} ry={lerp(0.2, 0.9, low)} fill="#000" opacity={0.35 * low} />

        <g transform={`translate(${padX} ${landerY}) scale(${scale})`}>
          {burning && <>
            <ellipse cx={0} cy={5.5} rx={4.5 * flick} ry={7 * flick} fill="url(#ls-glow)" />
            <path d={`M-1.3 3.6L0 ${5 + 9 * flick}L1.3 3.6Z`} fill="#ffe9bf" opacity="0.9" />
          </>}
          {/* Landing legs: struts with foot pads, swung out as the ground nears. */}
          {[-1, 1].map((d) => {
            const ex = d * (2.4 + 3.8 * legs)
            const ey = 1.2 + 4.3 * legs
            return (
              <g key={d} opacity={0.5 + 0.5 * legs}>
                <line x1={d * 2.3} y1={1.1} x2={ex} y2={ey} stroke="#5f6e84" strokeWidth="0.55" strokeLinecap="round" />
                <line x1={d * 2.3} y1={2.3} x2={d * 2.4 + (ex - d * 2.4) * 0.6} y2={2.3 + (ey - 2.3) * 0.7} stroke="#8393a9" strokeWidth="0.3" strokeLinecap="round" />
                <ellipse cx={ex} cy={ey + 0.1} rx={1.15} ry={0.32} fill="#47576b" stroke="#8fa0b4" strokeWidth="0.2" />
              </g>
            )
          })}
          {/* Engine bell. */}
          <path d="M-1.1 2.1L-1.9 3.9Q0 4.5 1.9 3.9L1.1 2.1Z" fill="url(#ls-hull)" stroke="#47576b" strokeWidth="0.25" />
          <ellipse cx={0} cy={3.95} rx={1.9} ry={0.5} fill="#1a2433" stroke="#47576b" strokeWidth="0.2" />
          {/* Side fins, lit side and shadow side, plus the front fin seen end-on. */}
          <path d="M-2.5 -0.2L-5.1 3.4L-2.5 2.5Z" fill="#d8573c" stroke="#7d2f20" strokeWidth="0.25" strokeLinejoin="round" />
          <path d="M2.5 -0.2L5.1 3.4L2.5 2.5Z" fill="#a63f2c" stroke="#7d2f20" strokeWidth="0.25" strokeLinejoin="round" />
          {/* Fuselage: a cylinder lit from the upper left, with a rounded base. */}
          <path d="M-2.6 -3.2L-2.6 2.3Q0 3.3 2.6 2.3L2.6 -3.2Z" fill="url(#ls-hull)" stroke="#6b7a90" strokeWidth="0.3" strokeLinejoin="round" />
          <path d="M-2.6 0.2L-2.6 1Q0 1.9 2.6 1L2.6 0.2Q0 1.1 -2.6 0.2Z" fill="#1f4a7a" />
          <path d="M-2.6 0.2L-2.6 1Q0 1.9 2.6 1L2.6 0.2Q0 1.1 -2.6 0.2Z" fill="url(#ls-shade)" />
          <path d="M-2.6 -3.2L-2.6 2.3Q0 3.3 2.6 2.3L2.6 -3.2Z" fill="url(#ls-shade)" />
          <path d="M-2.6 -0.8Q0 0 2.6 -0.8" fill="none" stroke="#6b7a90" strokeWidth="0.18" opacity="0.7" />
          <path d="M-2.6 -2.3Q0 -1.6 2.6 -2.3" fill="none" stroke="#6b7a90" strokeWidth="0.18" opacity="0.6" />
          {/* Nose cone. */}
          <path d="M-2.6 -3.2C-2.6 -5.2 -1.1 -6.6 0 -7.3C1.1 -6.6 2.6 -5.2 2.6 -3.2Q0 -2.4 -2.6 -3.2Z" fill="url(#ls-hull)" stroke="#6b7a90" strokeWidth="0.3" strokeLinejoin="round" />
          <path d="M-2.6 -3.2C-2.6 -5.2 -1.1 -6.6 0 -7.3C1.1 -6.6 2.6 -5.2 2.6 -3.2Q0 -2.4 -2.6 -3.2Z" fill="url(#ls-shade)" />
          <ellipse cx={0} cy={-7.3} rx={0.25} ry={0.25} fill="#d8573c" />
          <path d="M-1.7 -5.3Q-1.2 -6.3 -0.5 -6.7" fill="none" stroke="#fff" strokeWidth="0.3" strokeLinecap="round" opacity="0.6" />
          {/* Porthole with rim and a glint. */}
          <circle cx={-0.1} cy={-1.7} r={1.15} fill="#7d8da3" stroke="#47576b" strokeWidth="0.25" />
          <circle cx={-0.1} cy={-1.7} r={0.85} fill="url(#ls-glass)" />
          <ellipse cx={-0.45} cy={-2.0} rx={0.28} ry={0.18} fill="#fff" opacity="0.75" transform="rotate(-35 -0.45 -2)" />
          {/* Front fin end-on, over the hull. */}
          <path d="M-0.5 1.7L0.5 1.7L0.5 3.6Q0 3.9 -0.5 3.6Z" fill="#e0644a" stroke="#7d2f20" strokeWidth="0.2" />
        </g>

        {[5, W - 5].map((gx, gi) => (
        <g key={gi} transform={`translate(${gx} ${topPad}) scale(${gi ? -1 : 1} 1)`}>
          <line x1={0} y1={0} x2={0} y2={ladderH} stroke="#70d9ea" strokeWidth="0.3" opacity="0.5" />
          {Array.from({ length: 11 }, (_, i) => <line key={i} x1={0} y1={(i / 10) * ladderH} x2={i % 5 === 0 ? 2.2 : 1.2} y2={(i / 10) * ladderH} stroke="#70d9ea" strokeWidth="0.3" opacity="0.6" />)}
          <path d={`M-0.6 ${(1 - alt) * ladderH - 1.2}L2.8 ${(1 - alt) * ladderH}L-0.6 ${(1 - alt) * ladderH + 1.2}Z`} fill="#70d9ea" />
        </g>
        ))}
      </svg>
    </div>
  )
}
