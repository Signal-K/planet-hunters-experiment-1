'use client'

import { useEffect, useState } from 'react'
import type { TutorialStep } from '@/lib/data'
import { useIsDesktop } from '@/lib/hooks/useIsDesktop'
import { UI_ZONES } from '@/lib/ui-zones'

interface FlightPlanProps {
  stepIndex: number
  total: number
  step: TutorialStep
  onManualNext: () => void
  onSkip: () => void
}

/**
 * SSL-395 Flight Plan: replaces the TutorialCoach overlay. It lives in layout
 * flow (a strip between the screen and the nav), so it never covers a control.
 * The target control is marked by its own outline via
 * `html[data-flight-target="…"] [data-coach-id="…"]` in globals.css.
 * Action gating is unchanged: steps still complete from real game actions;
 * `manual` steps get a Continue button here.
 */
export default function FlightPlan({ stepIndex, total, step, onManualNext, onSkip }: FlightPlanProps) {
  const isDesktop = useIsDesktop()
  const [expanded, setExpanded] = useState(false)
  const [hidden, setHidden] = useState(false)

  const targetId = (isDesktop && step.desktopCoachId !== undefined) ? step.desktopCoachId : step.coachId
  const body = (isDesktop && step.desktopBody !== undefined) ? step.desktopBody : step.body
  const action = (isDesktop && step.desktopAction !== undefined)
    ? step.desktopAction
    : step.action ?? (step.manual && body ? body : (isDesktop ? 'Click ' : 'Tap ') + step.cta)

  useEffect(() => { setExpanded(false) }, [step.id, step.screen])

  useEffect(() => {
    if (hidden || !targetId) return
    const html = document.documentElement
    html.setAttribute('data-flight-target', targetId.split('|').join(' '))
    return () => { html.removeAttribute('data-flight-target') }
  }, [hidden, targetId])

  if (hidden) {
    return (
      <button
        type="button"
        className="flight-plan-chip"
        data-testid="flight-plan-chip"
        aria-label={`Show Flight Plan, training ${stepIndex + 1} of ${total}`}
        onClick={() => setHidden(false)}
      >
        Training {stepIndex + 1}/{total}
      </button>
    )
  }

  return (
    <section className="flight-plan" data-ui-zone={UI_ZONES.tutorialRail} data-testid="flight-plan" data-expanded={expanded} aria-label="Flight Plan">
      <div className="flight-plan-row">
        <button
          type="button"
          className="flight-plan-line"
          data-testid="flight-plan-objective"
          aria-expanded={expanded}
          onClick={() => setExpanded(v => !v)}
        >
          <span className="flight-plan-kicker">Flight Plan · {step.title} · {stepIndex + 1}/{total}</span>
          <span className="flight-plan-action">{action}</span>
        </button>
        {step.manual && (
          <button type="button" className="flight-plan-btn is-primary" data-testid="flight-plan-continue" onClick={onManualNext}>
            Continue
          </button>
        )}
        <button type="button" className="flight-plan-btn" data-testid="flight-plan-hide" aria-label="Hide Flight Plan" onClick={() => setHidden(true)}>
          ▾
        </button>
      </div>
      {expanded && (
        <div className="flight-plan-radio" data-testid="flight-plan-radio">
          <span className="flight-plan-kicker">{step.title} · Ops radio</span>
          {body && <p>{body}</p>}
          <button type="button" className="flight-plan-skip" data-testid="flight-plan-skip" onClick={onSkip}>
            Skip training
          </button>
        </div>
      )}
    </section>
  )
}
