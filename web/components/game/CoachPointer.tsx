'use client'

import { useLayoutEffect, useState } from 'react'

interface RingState {
  top: number
  left: number
  width: number
  height: number
  round: boolean
}

export default function CoachPointer({ coachId }: { coachId: string }) {
  const [ring, setRing] = useState<RingState | null>(null)

  useLayoutEffect(() => {
    let cancelled = false

    function measure() {
      if (cancelled) return
      const els = Array.from(document.querySelectorAll<HTMLElement>(`[data-coach-id="${coachId}"]`))
      const el = els.find(e => {
        const s = getComputedStyle(e)
        return s.display !== 'none' && s.visibility !== 'hidden' && parseFloat(s.opacity) > 0.05
      })
      if (!el) { setRing(null); return }
      const r = el.getBoundingClientRect()
      if (r.width === 0 && r.height === 0) { setRing(null); return }
      const isRound = r.height >= r.width * 0.7 && r.height <= r.width * 1.4
      if (!cancelled) setRing({ top: r.top, left: r.left, width: r.width, height: r.height, round: isRound })
    }

    measure()
    const t = setTimeout(measure, 450)
    window.addEventListener('resize', measure)
    return () => { cancelled = true; clearTimeout(t); window.removeEventListener('resize', measure) }
  }, [coachId])

  if (!ring) return null

  const PAD = 6
  return (
    <div
      style={{
        position: 'fixed',
        top: ring.top - PAD,
        left: ring.left - PAD,
        width: ring.width + PAD * 2,
        height: ring.height + PAD * 2,
        borderRadius: ring.round ? 999 : 10,
        border: '2px solid rgba(63,169,255,0.85)',
        boxShadow: '0 0 0 4px rgba(63,169,255,0.15), 0 0 18px rgba(63,169,255,0.4)',
        animation: 'coach-ring-pulse 1s ease-in-out infinite',
        pointerEvents: 'none',
        zIndex: 9999,
      }}
    />
  )
}
