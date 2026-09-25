'use client'

import { useMemo } from 'react'

/**
 * Drifting cyan/mint motes rising off the base — the scene's only ambient
 * motion besides the ridge parallax. Ported from `landnam-earth-base-v2.html`.
 *
 * Seeded deterministically rather than Math.random() so server and client
 * markup agree (this renders inside a client component under an SSR'd tree,
 * and a random layout would hydrate-mismatch every load).
 */
const COUNT = 16

export function AmbientMotes() {
  const motes = useMemo(() => {
    let seed = 20260726
    const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff }
    return Array.from({ length: COUNT }, () => {
      const dur = 9 + rnd() * 10
      return {
        left: rnd() * 100,
        dur,
        delay: -(rnd() * dur),
        drift: rnd() * 60 - 30,
        mint: rnd() > 0.6,
      }
    })
  }, [])

  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 2, overflow: 'hidden' }} aria-hidden="true">
      {motes.map((m, i) => (
        <span
          key={i}
          className="hub-mote"
          style={{
            position: 'absolute', bottom: '-4%',
            left: `${m.left}%`,
            width: 3, height: 3, borderRadius: '50%',
            background: m.mint ? 'var(--hub-mint)' : 'var(--hub-cyan)',
            boxShadow: m.mint
              ? '0 0 6px 1px rgba(90,208,126,0.8)'
              : '0 0 6px 1px rgba(112,217,234,0.8)',
            opacity: 0,
            animation: 'hub-float-up linear infinite',
            animationDuration: `${m.dur}s`,
            animationDelay: `${m.delay}s`,
            ['--drift' as string]: `${m.drift}px`,
          }}
        />
      ))}
    </div>
  )
}
