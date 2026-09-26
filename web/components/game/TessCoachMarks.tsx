'use client'

import { useCallback, useEffect, useLayoutEffect, useRef, useState, type RefObject } from 'react'
import { captureGameEvent } from '@/lib/posthog'
import { TESS_COACH_DONE_KEY, TESS_COACH_STEPS, type TessCoachStep, type TessCoachStepId } from '@/lib/tess-coach'

/**
 * SSL-359: action-gated coach marks for the TESS screen, replacing the four
 * ObservatoryCoach text slides. The screen owns the gates (gain, mark,
 * confirm) and calls `complete(stepId)` when the player has done the thing;
 * this hook only sequences steps, persists "done" and reports analytics.
 *
 * `training` is the first-ever run on the known-planet curve. A replay from
 * the "?" button runs the same steps on whatever curve is on screen and has
 * no outcome step, since only the training curve's answer is known.
 */
export function useTessCoach(eligible: boolean) {
  const [stepIndex, setStepIndex] = useState<number | null>(null)
  const [training, setTraining] = useState(false)
  const started = useRef(false)

  const steps = training ? TESS_COACH_STEPS : TESS_COACH_STEPS.filter(step => step.id !== 'outcome')
  const step: TessCoachStep | null = stepIndex == null ? null : steps[stepIndex] ?? null

  const track = useCallback((event: string, target: TessCoachStep, index: number, total: number, isTraining: boolean) => {
    captureGameEvent(event, {
      tutorial: 'tess',
      step_id: target.id,
      step_index: index,
      total_steps: total,
      replay: !isTraining,
    })
  }, [])

  const start = useCallback((isTraining: boolean) => {
    const runSteps = isTraining ? TESS_COACH_STEPS : TESS_COACH_STEPS.filter(s => s.id !== 'outcome')
    setTraining(isTraining)
    setStepIndex(0)
    track('tutorial_step_started', runSteps[0], 0, runSteps.length, isTraining)
  }, [track])

  // First visit only: a player who has never classified and has not finished
  // or skipped the coach before starts on the training curve.
  useEffect(() => {
    if (started.current || !eligible) return
    started.current = true
    let done = false
    try { done = window.localStorage.getItem(TESS_COACH_DONE_KEY) === '1' } catch { /* storage blocked: show it */ }
    if (!done) start(true)
  }, [eligible, start])

  const finish = useCallback(() => {
    setStepIndex(null)
    setTraining(false)
    try { window.localStorage.setItem(TESS_COACH_DONE_KEY, '1') } catch { /* ignore */ }
  }, [])

  const complete = useCallback((id: TessCoachStepId) => {
    if (!step || step.id !== id || stepIndex == null) return
    track('tutorial_step_completed', step, stepIndex, steps.length, training)
    const nextIndex = stepIndex + 1
    if (nextIndex >= steps.length) {
      if (training) captureGameEvent('tutorial_completed', { tutorial: 'tess' })
      finish()
      return
    }
    setStepIndex(nextIndex)
    track('tutorial_step_started', steps[nextIndex], nextIndex, steps.length, training)
  }, [finish, step, stepIndex, steps, track, training])

  const skip = useCallback(() => {
    if (step && stepIndex != null) {
      captureGameEvent('tutorial_skipped', {
        tutorial: 'tess',
        step_id: step.id,
        step_index: stepIndex,
        total_steps: steps.length,
        replay: !training,
      })
    }
    finish()
  }, [finish, step, stepIndex, steps.length, training])

  return {
    step,
    stepIndex,
    total: steps.length,
    training: training && step != null,
    active: step != null,
    start,
    complete,
    skip,
  }
}

interface Rect { top: number; left: number; width: number; height: number }

const ACTION_STEP_COUNT = TESS_COACH_STEPS.filter(step => step.id !== 'outcome').length
const HOLE_PAD = 8
const GUTTER = 16
const BUBBLE_MAX_W = 320

function unionRect(rects: DOMRect[], origin: DOMRect): Rect | null {
  if (!rects.length) return null
  const top = Math.min(...rects.map(r => r.top)) - origin.top - HOLE_PAD
  const left = Math.min(...rects.map(r => r.left)) - origin.left - HOLE_PAD
  const bottom = Math.max(...rects.map(r => r.bottom)) - origin.top + HOLE_PAD
  const right = Math.max(...rects.map(r => r.right)) - origin.left + HOLE_PAD
  return { top, left, width: right - left, height: bottom - top }
}

function findTarget(root: HTMLElement, id: string): HTMLElement | null {
  return root.querySelector<HTMLElement>(`[data-coach-target="${id}"]`)
}

/**
 * Dims the screen except the step's real controls, and pins one short hint
 * to the control it names. The dim layer blocks taps; the hole passes them
 * through to the control underneath, so the only way on is to do the step.
 */
export function TessCoachOverlay({ step, stepIndex, total, hint, rootRef, onSkip, onDone }: {
  step: TessCoachStep
  stepIndex: number
  total: number
  hint: string
  rootRef: RefObject<HTMLElement | null>
  onSkip: () => void
  /** Only for the outcome step, which has no control to act on. */
  onDone?: () => void
}) {
  const [hole, setHole] = useState<Rect | null>(null)
  const [anchor, setAnchor] = useState<Rect | null>(null)
  const [size, setSize] = useState({ width: 0, height: 0 })

  // Bring the step's control on screen when the step changes.
  useEffect(() => {
    const root = rootRef.current
    if (!root) return
    for (const id of [...step.targets, step.anchor]) findTarget(root, id)?.scrollIntoView({ block: 'nearest' })
  }, [rootRef, step.anchor, step.targets])

  // Track the controls every frame: layout shifts (keyboard, rotation, the
  // sticky action dock growing) must never leave the hole over the wrong spot.
  useLayoutEffect(() => {
    let raf = 0
    const measure = () => {
      const root = rootRef.current
      if (root) {
        const origin = root.getBoundingClientRect()
        const targets = step.targets
          .map(id => findTarget(root, id))
          .filter((el): el is HTMLElement => !!el)
          .map(el => el.getBoundingClientRect())
        const anchorEl = findTarget(root, step.anchor)
        const nextHole = unionRect(targets, origin)
        const nextAnchor = anchorEl ? unionRect([anchorEl.getBoundingClientRect()], origin) : null
        setHole(prev => sameRect(prev, nextHole) ? prev : nextHole)
        setAnchor(prev => sameRect(prev, nextAnchor) ? prev : nextAnchor)
        setSize(prev => prev.width === origin.width && prev.height === origin.height ? prev : { width: origin.width, height: origin.height })
      }
      raf = requestAnimationFrame(measure)
    }
    measure()
    return () => cancelAnimationFrame(raf)
  }, [rootRef, step.anchor, step.targets])

  if (!hole || !anchor || !size.width) return null

  const bubbleW = Math.min(BUBBLE_MAX_W, size.width - GUTTER * 2)
  const bubblePos = placeBubble(hole, anchor, size, bubbleW)

  const holeBottom = hole.top + hole.height
  const holeRight = hole.left + hole.width
  const shade = { position: 'absolute' as const, background: 'var(--ln-overlay)', pointerEvents: 'auto' as const }

  return (
    <div data-testid="tess-coach" data-coach-step={step.id} style={{ position: 'absolute', inset: 0, zIndex: 60, pointerEvents: 'none' }}>
      <div style={{ ...shade, top: 0, left: 0, right: 0, height: Math.max(0, hole.top) }} />
      <div style={{ ...shade, top: holeBottom, left: 0, right: 0, bottom: 0 }} />
      <div style={{ ...shade, top: Math.max(0, hole.top), left: 0, width: Math.max(0, hole.left), height: hole.height }} />
      <div style={{ ...shade, top: Math.max(0, hole.top), left: holeRight, right: 0, height: hole.height }} />
      <div
        aria-hidden
        style={{
          position: 'absolute', top: hole.top, left: hole.left, width: hole.width, height: hole.height,
          borderRadius: 'var(--ln-r-md)', boxShadow: 'var(--ln-glow-cyan)', pointerEvents: 'none',
        }}
      />
      <div
        role="status"
        aria-label={`TESS hint ${stepIndex + 1} of ${total}`}
        data-testid="tess-coach-hint"
        style={{
          position: 'absolute', width: bubbleW, ...bubblePos,
          pointerEvents: 'auto',
          display: 'flex', alignItems: 'center', gap: 'var(--ln-s-3)',
          padding: 'var(--ln-s-3) var(--ln-s-4)',
          background: 'var(--ln-panel)', border: '1px solid var(--ln-cyan-border)', borderRadius: 'var(--ln-r-md)',
          boxShadow: 'var(--ln-shadow-modal)',
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: 'var(--ln-font-display)', fontSize: 9, fontWeight: 800, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--ln-cyan)' }}>
            {step.id === 'outcome' ? 'KNOWN PLANET' : `STEP ${stepIndex + 1} / ${ACTION_STEP_COUNT}`}
          </div>
          <div data-testid="tess-coach-hint-text" style={{ fontFamily: 'var(--ln-font-display)', fontSize: 15, fontWeight: 800, color: 'var(--ln-text)', lineHeight: 1.25, marginTop: 4 }}>
            {hint}
          </div>
        </div>
        {onDone ? (
          <button
            type="button"
            data-testid="tess-coach-done"
            onClick={onDone}
            style={{
              minHeight: 44, padding: '0 var(--ln-s-4)', borderRadius: 'var(--ln-r-md)', cursor: 'pointer',
              border: '1px solid var(--ln-cyan-border)', background: 'var(--ln-cyan-soft)', color: 'var(--ln-cyan-bright)',
              fontFamily: 'var(--ln-font-display)', fontSize: 11, fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase',
            }}
          >
            Done
          </button>
        ) : (
          <button
            type="button"
            data-testid="tess-coach-skip"
            onClick={onSkip}
            style={{
              minHeight: 44, padding: '0 var(--ln-s-2)', border: 0, background: 'transparent', cursor: 'pointer',
              color: 'var(--ln-text-muted)', fontFamily: 'var(--ln-font-display)', fontSize: 10, fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase',
            }}
          >
            Skip
          </button>
        )}
      </div>
    </div>
  )
}

// Room the hint needs beside the lit area (two text lines plus padding).
const BUBBLE_H = 88

/**
 * Keep the hint outside the lit area so it never covers the control it
 * names: below or above it in portrait, beside it when a landscape phone
 * leaves no room above or below; only as a last resort over the dimmed
 * bottom edge.
 */
function placeBubble(hole: Rect, anchor: Rect, size: { width: number; height: number }, bubbleW: number): { top?: number; bottom?: number; left: number } {
  const holeBottom = hole.top + hole.height
  const holeRight = hole.left + hole.width
  const centredLeft = Math.max(GUTTER, Math.min(size.width - GUTTER - bubbleW, anchor.left + anchor.width / 2 - bubbleW / 2))
  const spaceBelow = size.height - holeBottom
  const spaceAbove = hole.top
  if (spaceBelow >= BUBBLE_H + HOLE_PAD || spaceAbove >= BUBBLE_H + HOLE_PAD) {
    return spaceBelow >= spaceAbove
      ? { top: holeBottom + HOLE_PAD, left: centredLeft }
      : { bottom: size.height - hole.top + HOLE_PAD, left: centredLeft }
  }
  const sideTop = Math.max(GUTTER, Math.min(size.height - GUTTER - BUBBLE_H, anchor.top + anchor.height / 2 - BUBBLE_H / 2))
  if (size.width - holeRight >= bubbleW + GUTTER) return { top: sideTop, left: holeRight + HOLE_PAD }
  if (hole.left >= bubbleW + GUTTER) return { top: sideTop, left: hole.left - HOLE_PAD - bubbleW }
  return { bottom: GUTTER, left: centredLeft }
}

function sameRect(a: Rect | null, b: Rect | null): boolean {
  if (a === b) return true
  if (!a || !b) return false
  return Math.abs(a.top - b.top) < 0.5 && Math.abs(a.left - b.left) < 0.5
    && Math.abs(a.width - b.width) < 0.5 && Math.abs(a.height - b.height) < 0.5
}

/** The small "?" on the TESS screen that reopens the hints. */
export function TessCoachHelpButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      data-testid="tess-coach-help"
      aria-label="Show TESS hints"
      onClick={onClick}
      style={{
        width: 44, height: 44, borderRadius: 'var(--ln-r-pill)', cursor: 'pointer',
        border: '1px solid var(--ln-cyan-border)', background: 'var(--ln-cyan-soft)', color: 'var(--ln-cyan-bright)',
        fontFamily: 'var(--ln-font-display)', fontSize: 16, fontWeight: 800,
      }}
    >
      ?
    </button>
  )
}
