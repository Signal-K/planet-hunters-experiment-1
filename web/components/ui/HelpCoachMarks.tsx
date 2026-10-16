'use client'

import { useEffect, useLayoutEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import type { HelpCoachStep } from '@/lib/help/topics'

interface Rect { top: number; left: number; width: number; height: number }

const HOLE_PAD = 8
const GUTTER = 16
const BUBBLE_MAX_W = 340
const BUBBLE_H = 150

function findTarget(id: string): HTMLElement | null {
  return document.querySelector<HTMLElement>(`[data-coach-target="${id}"]`)
}

function sameRect(a: Rect | null, b: Rect | null): boolean {
  if (a === b) return true
  if (!a || !b) return false
  return Math.abs(a.top - b.top) < 0.5 && Math.abs(a.left - b.left) < 0.5
    && Math.abs(a.width - b.width) < 0.5 && Math.abs(a.height - b.height) < 0.5
}

function union(rects: DOMRect[]): Rect | null {
  if (!rects.length) return null
  const top = Math.min(...rects.map(r => r.top)) - HOLE_PAD
  const left = Math.min(...rects.map(r => r.left)) - HOLE_PAD
  const bottom = Math.max(...rects.map(r => r.bottom)) + HOLE_PAD
  const right = Math.max(...rects.map(r => r.right)) + HOLE_PAD
  return { top, left, width: right - left, height: bottom - top }
}

const SIDE_MIN_W = 200

/** Keep the bubble outside the lit area so it never covers the control it names.
 *  Above or below when there is room, else beside a tall target, else (nothing
 *  fits) pinned to the bottom edge. */
export function placeBubble(hole: Rect, vw: number, vh: number, bubbleW: number): { top?: number; bottom?: number; left: number; width: number } {
  const left = Math.max(GUTTER, Math.min(vw - GUTTER - bubbleW, hole.left + hole.width / 2 - bubbleW / 2))
  const below = vh - (hole.top + hole.height)
  const above = hole.top
  if (below >= BUBBLE_H + HOLE_PAD) return { top: hole.top + hole.height + HOLE_PAD, left, width: bubbleW }
  if (above >= BUBBLE_H + HOLE_PAD) return { bottom: vh - hole.top + HOLE_PAD, left, width: bubbleW }
  const right = vw - (hole.left + hole.width) - HOLE_PAD - GUTTER
  const leftRoom = hole.left - HOLE_PAD - GUTTER
  const top = Math.max(GUTTER, Math.min(vh - GUTTER - BUBBLE_H, hole.top))
  if (right >= SIDE_MIN_W && right >= leftRoom) return { top, left: hole.left + hole.width + HOLE_PAD, width: Math.min(bubbleW, right) }
  if (leftRoom >= SIDE_MIN_W) { const w = Math.min(bubbleW, leftRoom); return { top, left: hole.left - HOLE_PAD - w, width: w } }
  return { bottom: GUTTER, left, width: bubbleW }
}

/**
 * Optional "Show me" run (SSL-432). Dims everything except the step's real
 * controls and pins one short hint beside them. The dim layer blocks taps,
 * the lit hole passes them through to the control underneath. It only ever
 * runs after the player asks for it from the help sheet.
 */
export default function HelpCoachMarks({ step, index, total, onNext, onStop }: {
  step: HelpCoachStep
  index: number
  total: number
  onNext: () => void
  onStop: () => void
}) {
  const [hole, setHole] = useState<Rect | null>(null)
  const [view, setView] = useState({ w: 0, h: 0 })
  const [flightPlan, setFlightPlan] = useState<HTMLElement | null>(null)

  useLayoutEffect(() => {
    const isVisible = (element: HTMLElement) => element.getClientRects().length > 0
    const miningCue = document.querySelector<HTMLElement>('[data-testid="mining-training-tip"]')
    const flightPlan = document.querySelector<HTMLElement>('[data-testid="flight-plan-slot"]')
    setFlightPlan((miningCue && isVisible(miningCue) ? miningCue : null)
      ?? flightPlan)
  }, [])

  useEffect(() => {
    for (const id of step.targets) findTarget(id)?.scrollIntoView({ block: 'nearest' })
  }, [step.targets])

  // Track the controls every frame: rotation, a keyboard or a growing dock
  // must never leave the hole over the wrong spot.
  useLayoutEffect(() => {
    let raf = 0
    const measure = () => {
      const rects = step.targets.map(findTarget).filter((el): el is HTMLElement => !!el).map(el => el.getBoundingClientRect())
      const next = union(rects)
      setHole(prev => sameRect(prev, next) ? prev : next)
      setView(prev => prev.w === window.innerWidth && prev.h === window.innerHeight ? prev : { w: window.innerWidth, h: window.innerHeight })
      raf = requestAnimationFrame(measure)
    }
    measure()
    return () => cancelAnimationFrame(raf)
  }, [step.targets])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.stopPropagation(); onStop() }
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [onStop])

  if (!hole || !view.w) return null

  const bubbleW = Math.min(BUBBLE_MAX_W, view.w - GUTTER * 2)
  const pos = placeBubble(hole, view.w, view.h, bubbleW)
  const shade = { position: 'absolute' as const, background: 'rgba(15, 36, 54, 0.38)', pointerEvents: 'auto' as const }
  const holeBottom = hole.top + hole.height
  const holeRight = hole.left + hole.width
  const last = index + 1 >= total
  const buttonStyle = {
    minHeight: 44, minWidth: 44, padding: '0 var(--ln-s-4)', borderRadius: 'var(--ln-r-md)', cursor: 'pointer',
    fontFamily: 'var(--ln-font-display)', fontSize: 14, fontWeight: 800,
  }

  const dock = (
    <div
      role="status"
      aria-label={`Show me, ${index + 1} of ${total}`}
      data-testid="help-coach-hint"
      className="help-coach-dock"
      style={{
        position: flightPlan ? 'relative' : 'absolute', ...(flightPlan ? {} : pos), pointerEvents: 'auto',
        padding: 'var(--ln-s-3) var(--ln-s-4)', background: 'var(--ln-blueprint-paper, #fff)', color: 'var(--ln-bp-ink, #0f2436)',
        border: '2px solid var(--ln-cyan-border)', borderRadius: 'var(--ln-r-md)', boxShadow: '4px 4px 0 var(--ln-blueprint-blue, #1f78c1)',
        ...(flightPlan ? { width: '100%', maxWidth: 'none', maxHeight: 'none' } : {}),
      }}
    >
      <div className="help-coach-dock-head">
        <span className="ops-badge" aria-hidden="true">OPS</span>
        <span className="help-coach-dock-kicker">Show me · {index + 1} of {total}</span>
      </div>
      <div data-testid="help-coach-hint-text" style={{ fontSize: 15, fontWeight: 700, lineHeight: 1.35, margin: '4px 0 var(--ln-s-3)' }}>
        {step.hint}
      </div>
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <button type="button" data-testid="help-coach-stop" onClick={onStop} style={{ ...buttonStyle, border: '2px solid var(--ln-cyan-border)', background: 'var(--ln-panel)', color: 'var(--ln-bp-ink, #0f2436)' }}>
          Skip
        </button>
        <button type="button" data-testid="help-coach-next" onClick={onNext} style={{ ...buttonStyle, border: '2px solid var(--ln-cyan-border)', background: 'var(--ln-cyan-soft)', color: 'var(--ln-bp-ink, #0f2436)' }}>
          {last ? 'Done' : 'Next'}
        </button>
      </div>
    </div>
  )

  return (
    <div data-testid="help-coach" data-coach-step={step.id} style={{ position: 'fixed', inset: 0, zIndex: 80, pointerEvents: 'none' }}>
      <div style={{ ...shade, top: 0, left: 0, right: 0, height: Math.max(0, hole.top) }} />
      <div style={{ ...shade, top: holeBottom, left: 0, right: 0, bottom: 0 }} />
      <div style={{ ...shade, top: Math.max(0, hole.top), left: 0, width: Math.max(0, hole.left), height: hole.height }} />
      <div style={{ ...shade, top: Math.max(0, hole.top), left: holeRight, right: 0, height: hole.height }} />
      <div aria-hidden className="help-coach-brackets" style={{ position: 'absolute', top: hole.top - 7, left: hole.left - 7, width: hole.width + 14, height: hole.height + 14 }} />
      {flightPlan ? createPortal(dock, flightPlan) : dock}
    </div>
  )
}
