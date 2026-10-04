'use client'

import { useEffect, useRef, useState } from 'react'
import type { TutorialStep, TrainingTryStep } from '@/lib/data'
import { useIsDesktop } from '@/lib/hooks/useIsDesktop'
import { UI_ZONES } from '@/lib/ui-zones'

interface FlightPlanProps {
  stepIndex: number
  total: number
  step: TutorialStep | TrainingTryStep
  onSkip: () => void
  hidden?: boolean
  onHiddenChange?: (hidden: boolean) => void
  hint?: string
}

/**
 * SSL-395 Flight Plan replaces the retired overlay guidance. It lives in layout
 * flow (a strip between the screen and the nav), so it never covers a control.
 * The target control is marked by its own outline via
 * `html[data-flight-target="…"] [data-coach-id="…"]` in globals.css.
 * Action gating is unchanged: steps still complete from real game actions;
 * `manual` steps get a Continue button here.
 */
export default function FlightPlan({ stepIndex, total, step, onSkip, hidden: persistedHidden, onHiddenChange, hint }: FlightPlanProps) {
  const isDesktop = useIsDesktop()
  const [expanded, setExpanded] = useState(false)
  const [hidden, setHidden] = useState(false)
  const stripRef = useRef<HTMLElement>(null)

  useEffect(() => { if (persistedHidden !== undefined) setHidden(persistedHidden) }, [persistedHidden])

  const isTryStep = 'try' in step
  const targetId = isTryStep ? step.beacon : ((isDesktop && step.desktopCoachId !== undefined) ? step.desktopCoachId : step.coachId)
  const body = isTryStep ? step.radio : ((isDesktop && step.desktopBody !== undefined) ? step.desktopBody : step.body)
  const action = isTryStep ? step.objective : ((isDesktop && step.desktopAction !== undefined)
    ? step.desktopAction
    : step.action ?? (step.manual && body ? body : (isDesktop ? 'Click ' : 'Tap ') + step.cta))

  useEffect(() => { setExpanded(false) }, [step.id, step.screen])

  useEffect(() => {
    if (hidden || !targetId) return
    const html = document.documentElement
    html.setAttribute('data-flight-target', targetId.split('|').join(' '))
    return () => { html.removeAttribute('data-flight-target') }
  }, [hidden, targetId])

  // Publish the strip's height so bottom-anchored status pills (the sync note)
  // sit above it instead of on top of its text.
  useEffect(() => {
    const el = stripRef.current
    if (hidden || !el) return
    const root = document.documentElement
    const publish = () => root.style.setProperty('--flight-plan-h', `${el.offsetHeight}px`)
    publish()
    const observer = new ResizeObserver(publish)
    observer.observe(el)
    return () => { observer.disconnect(); root.style.removeProperty('--flight-plan-h') }
  }, [hidden])

  if (hidden) {
    return (
      <button
        type="button"
        className="flight-plan-chip"
        data-testid="flight-plan-chip"
        aria-label={`Show Flight Plan, training ${stepIndex + 1} of ${total}`}
        onClick={() => { setHidden(false); onHiddenChange?.(false) }}
      >
        Training {stepIndex + 1}/{total}
      </button>
    )
  }

  return (
    <section ref={stripRef} className="flight-plan" data-ui-zone={UI_ZONES.tutorialRail} data-testid="flight-plan" data-expanded={expanded} aria-label="Flight Plan">
      <div className="flight-plan-row">
        <button
          type="button"
          className="flight-plan-line"
          data-testid="flight-plan-objective"
          aria-expanded={expanded}
          onClick={() => setExpanded(v => !v)}
        >
          <span className="flight-plan-kicker">Flight Plan · {isTryStep ? step.try : step.title} · {stepIndex + 1}/{total}</span>
          <span className="flight-plan-action">{hint && !expanded ? `Hint: ${hint}` : action}</span>
        </button>
        <button type="button" className="flight-plan-btn" data-testid="flight-plan-hide" aria-label="Hide Flight Plan" onClick={() => { setHidden(true); onHiddenChange?.(true) }}>
          ▾
        </button>
      </div>
      {expanded && (
        <div className="flight-plan-radio" data-testid="flight-plan-radio">
          <span className="flight-plan-kicker">{isTryStep ? step.try : step.title} · Ops radio</span>
          {body && <p>{body}</p>}
          {hint && <p className="flight-plan-hint">Hint: {hint}</p>}
          <button type="button" className="flight-plan-skip" data-testid="flight-plan-skip" onClick={onSkip}>
            Skip training
          </button>
        </div>
      )}
    </section>
  )
}
