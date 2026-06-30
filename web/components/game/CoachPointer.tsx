'use client'

import { useLayoutEffect, useState } from 'react'

interface RingState {
  top: number
  left: number
  width: number
  height: number
  round: boolean
}

const DOWN_PATH  = "2,2 13,14 24,2"
const UP_PATH    = "2,14 13,2 24,14"
const LEFT_PATH  = "14,2 2,13 14,24"
const RIGHT_PATH = "2,2 14,13 2,24"

function Chevron({ path, horiz }: { path: string; horiz: boolean }) {
  if (horiz) return (
    <svg width="16" height="26" viewBox="0 0 16 26">
      <polyline points={path} fill="none" stroke="#f5a623" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
  return (
    <svg width="26" height="16" viewBox="0 0 26 16">
      <polyline points={path} fill="none" stroke="#f5a623" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

function isVisible(el: HTMLElement): boolean {
  const s = getComputedStyle(el)
  return s.display !== 'none' && s.visibility !== 'hidden' && parseFloat(s.opacity) > 0.05
}

// coachId may be a '|'-delimited priority list — first visible element wins.
// e.g. 'radial-missions|radial-toggle': points to MISSIONS when menu is open,
// falls back to the toggle button when the menu is closed.
export default function CoachPointer({ coachId, dir }: { coachId: string; dir?: string }) {
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
  const cx = ring.left + ring.width / 2

  const arrows = dir ? [0, 1, 2].map(i => {
    const style: React.CSSProperties = {
      position: 'fixed',
      pointerEvents: 'none',
      zIndex: 9998,
      animation: 'coach-arrow-bounce 0.9s ease-in-out infinite',
      animationDelay: `${i * 0.16}s`,
      opacity: 1 - i * 0.2,
    }
    const W = 26, H = 16, GAP = 5
    if (dir === 'down') {
      return <div key={i} style={{ ...style, top: ring.top - PAD - H - i * (H + GAP), left: cx - W / 2 }}><Chevron path={DOWN_PATH} horiz={false}/></div>
    }
    if (dir === 'up') {
      return <div key={i} style={{ ...style, top: ring.top + ring.height + PAD + i * (H + GAP), left: cx - W / 2 }}><Chevron path={UP_PATH} horiz={false}/></div>
    }
    if (dir === 'left') {
      const cy = ring.top + ring.height / 2
      return <div key={i} style={{ ...style, top: cy - 13, left: ring.left + ring.width + PAD + i * (16 + GAP) }}><Chevron path={LEFT_PATH} horiz={true}/></div>
    }
    if (dir === 'right') {
      const cy = ring.top + ring.height / 2
      return <div key={i} style={{ ...style, top: cy - 13, left: ring.left - PAD - (i + 1) * (16 + GAP) }}><Chevron path={RIGHT_PATH} horiz={true}/></div>
    }
    return null
  }) : null

  return (
    <>
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
      {arrows}
    </>
  )
}
