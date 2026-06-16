'use client'

import { useMemo } from 'react'

export function AmbientStars() {
  const dots = useMemo(() => {
    const out: { x: number; y: number; r: number; o: number; d: number }[] = []
    let seed = 1337
    const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff }
    for (let i = 0; i < 55; i++) {
      out.push({ x: rnd() * 100, y: rnd() * 92, r: 0.6 + rnd() * 1.4, o: 0.3 + rnd() * 0.6, d: 1.6 + rnd() * 2.8 })
    }
    return out
  }, [])
  return (
    <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none" style={{ position: 'absolute', inset: 0 }}>
      {dots.map((s, i) => (
        <circle key={i} cx={s.x} cy={s.y} r={s.r} fill="#fff" opacity={s.o}>
          <animate attributeName="opacity" values={`${s.o};${s.o * 0.25};${s.o}`} dur={s.d + 's'} repeatCount="indefinite"/>
        </circle>
      ))}
    </svg>
  )
}
