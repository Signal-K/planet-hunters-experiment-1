'use client'

import { useLayoutEffect, useState } from 'react'

interface RingState {
  top: number
  left: number
  width: number
  height: number
  round: boolean
}

function isVisible(el: HTMLElement): boolean {
  const s = getComputedStyle(el)
  return s.display !== 'none' && s.visibility !== 'hidden' && parseFloat(s.opacity) > 0.05
}

// coachId may be a '|'-delimited priority list — first visible element wins.
// e.g. 'build-confirm|build-plot-0': points to the confirm button once a
// plot is picked, falls back to the first plot before one is picked.
export default function CoachPointer({ coachId }: { coachId: string; dir?: string }) {
  const [ring, setRing] = useState<RingState | null>(null)
  const ids = coachId.split('|')

  useLayoutEffect(() => {
    let cancelled = false

    function measure() {
      if (cancelled) return
      let found: HTMLElement | null = null
      for (const id of ids) {
        const match = Array.from(document.querySelectorAll<HTMLElement>(`[data-coach-id="${id}"]`)).find(isVisible)
        if (match) { found = match; break }
      }
      if (!found) { setRing(null); return }
      const r = found.getBoundingClientRect()
      if (r.width === 0 && r.height === 0) { setRing(null); return }
      const isRound = r.height >= r.width * 0.7 && r.height <= r.width * 1.4
      if (!cancelled) setRing({ top: r.top, left: r.left, width: r.width, height: r.height, round: isRound })
    }

    measure()
    const t = setTimeout(measure, 450)
    window.addEventListener('resize', measure)
    return () => { cancelled = true; clearTimeout(t); window.removeEventListener('resize', measure) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coachId])

  if (!ring) return null

  const PAD = 6

  return (
    <>
      <div
        data-testid="tutorial-coach-ring"
        style={{
          position: 'fixed',
          top: ring.top - PAD,
          left: ring.left - PAD,
          width: ring.width + PAD * 2,
          height: ring.height + PAD * 2,
          borderRadius: ring.round ? 999 : 10,
          border: '2px solid var(--ln-cyan)',
          boxShadow: '0 0 0 3px var(--ln-cyan-soft), 0 0 14px var(--ln-cyan-border)',
          animation: 'coach-ring-pulse 1s ease-in-out infinite',
          pointerEvents: 'none',
          zIndex: 9999,
        }}
      />
    </>
  )
}
