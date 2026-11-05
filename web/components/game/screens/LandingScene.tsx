'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { defaultSpec } from '@takeon/engine'
import TakeOnMount from '@/components/takeon/TakeOnMount'
import { takeonBodyForTarget } from '@/lib/takeon/bodies'
import type { LandingSequenceMode } from '@/lib/engine/scripts/LandingController'
import type { Target } from '@/lib/data'

interface Props {
  target: Pick<Target, 'id' | 'type'>
  progress: number
  mode: LandingSequenceMode
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t
const ease = (t: number) => t * t * (3 - 2 * t)

function rng(seed0: number) {
  let seed = seed0
  return () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647 }
}

/**
 * Descent and ascent over the destination's own Takeon landscape. Takeon draws
 * the ground (read-only, the same world the rovers later work on); this layer
 * adds the star field, the lander with its plume and dust, the landing ring and
 * the orbiter. Altitude runs from 1 (orbit: the world is a small, hazy diorama
 * in space) to 0 (surface: the field fills the view). The Takeon view is wider
 * than the screen so the field's own parked rover sits off to the right, out of frame.
 */
export default function LandingScene({ target, progress, mode }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState({ w: 160, h: 100 })
  const [tick, setTick] = useState(0)
  const rover = useMemo(() => defaultSpec(), [])

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

  const stars = useMemo(() => {
    const r = rng(41)
    return Array.from({ length: 110 }, () => ({ x: r(), y: r(), s: 0.12 + r() * 0.3, o: 0.35 + r() * 0.6 }))
  }, [])

  const padX = W * 0.5
  const padY = H * 0.66
  const landerY = lerp(H * 0.2, padY - 4, ease(1 - alt))
  const scale = lerp(0.8, 1.3, low)
  const burning = mode === 'descend' ? progress < 0.985 : progress > 0.02
  const flick = 0.75 + 0.25 * Math.sin(tick * 1.9)
  const legs = Math.min(1, Math.max(0, (low - 0.45) / 0.35))
  const dust = Math.max(0, (low - 0.82) / 0.18)
  const orbX = lerp(padX - 4, padX - 26, low)
  const orbY = lerp(landerY - 13, -14, ease(low))
  const orbA = Math.max(0, 1 - low * 1.25)

  return (
    <div ref={ref} style={{ position: 'absolute', inset: 0, overflow: 'hidden', background: '#02040b' }}>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="100%" preserveAspectRatio="xMidYMid slice" aria-hidden="true" style={{ position: 'absolute', inset: 0 }}>
        {stars.map((s, i) => <circle key={i} cx={s.x * W} cy={s.y * H} r={s.s} fill="#fff" opacity={s.o} />)}
      </svg>

      <div style={{ position: 'absolute', top: 0, bottom: 0, left: 0, width: '240%', transform: `scale(${lerp(0.5, 1.08, low)})`, transformOrigin: '20.8% 62%', opacity: lerp(0.55, 1, low), filter: `blur(${(1 - low) * 1.6}px)` }}>
        <TakeOnMount
          missionId={`landing-${target.id}`}
          bodyId={takeonBodyForTarget(target)}
          rover={rover}
          startView="iso"
          readOnly
        />
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="100%" preserveAspectRatio="xMidYMid slice" role="img" aria-label={mode === 'descend' ? 'Lander descending to the surface' : 'Lander climbing to orbit'} data-testid="landing-canvas" style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
        <defs>
          <radialGradient id="ls-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0" stopColor="#ffd9a0" stopOpacity="0.95" />
            <stop offset="0.5" stopColor="#ff8a3c" stopOpacity="0.5" />
            <stop offset="1" stopColor="#ff8a3c" stopOpacity="0" />
          </radialGradient>
          <filter id="ls-blur"><feGaussianBlur stdDeviation="1.1" /></filter>
        </defs>

        <g opacity={Math.min(1, low * 1.6)}>
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

        <g transform={`translate(5 ${H * 0.2})`}>
          <line x1={0} y1={0} x2={0} y2={H * 0.58} stroke="#70d9ea" strokeWidth="0.3" opacity="0.5" />
          {Array.from({ length: 11 }, (_, i) => <line key={i} x1={0} y1={(i / 10) * H * 0.58} x2={i % 5 === 0 ? 2.2 : 1.2} y2={(i / 10) * H * 0.58} stroke="#70d9ea" strokeWidth="0.3" opacity="0.6" />)}
          <path d={`M-0.6 ${(1 - alt) * H * 0.58 - 1.2}L2.8 ${(1 - alt) * H * 0.58}L-0.6 ${(1 - alt) * H * 0.58 + 1.2}Z`} fill="#70d9ea" />
        </g>
      </svg>
    </div>
  )
}
