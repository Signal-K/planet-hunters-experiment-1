'use client'

import React from 'react'

// Persistent "what to do next" wayfinding strip for the Mission → Target →
// Rocket → Launch flow — Core Principle #1 in the Mission Board Craft doc
// ("it should be extremely clear what to do next... current step
// description/title in the footer"). Real player feedback (PostHog M1/M3
// surveys, 2026-07-18–20) named "knowing where to go next" and "understanding
// the scanner" as the hardest friction points, and this footer had not
// actually shipped on any of these screens — see Craft doc "Mission Board:
// De-Toying the Open Design Prototype (Hybrid Direction Research)".
//
// The 4th step is "Launch" — the rocket-launch confirmation screen — per the
// nav strip in the Open Design reference (open-design/.od/projects/
// a531c672-4e0b-4c34-bd0f-19a33add20c6/landnam-earth-base-v2.html: Base /
// Mission / Target / Rocket / Launch / Mining / Debrief) and explicit
// product direction 2026-07-26. An earlier "Relay" label here was wrong —
// don't reintroduce it.
export const MISSION_FLOW_STEPS = ['Mission', 'Target', 'Rocket', 'Launch'] as const
const STEP_SEQUENCE = MISSION_FLOW_STEPS
export type MissionFlowStep = typeof STEP_SEQUENCE[number]

interface StepFooterProps {
  step: MissionFlowStep
  description: string
  // Mission Board renders this as a full-bleed strip pinned to the bottom of
  // the screen (default). Screens that already have their own sticky CTA bar
  // (Target Picker, Rocket Purchase, via MissionSetupShell) render it inline,
  // stacked above that bar instead, so it takes part in normal layout flow.
  inline?: boolean
}

// Step pills + arrow separators — "[Step 1: Mission] → [Step 2: Target] →
// [Step 3: Rocket] → [Step 4: Relay]" per the design-language doc's Step
// Footer spec (workspace/projects/landnam/decisions/
// landnam-ui-design-language-style-prompt.md §2.2): current = cyan filled,
// done = green text, future = dim with border.
function StepPills({ idx }: { idx: number }) {
  return (
    <div className="step-footer-pills" aria-hidden="true">
      {STEP_SEQUENCE.map((s, i) => (
        <React.Fragment key={s}>
          {i > 0 && <span className="step-footer-arrow">→</span>}
          <span
            className="step-footer-pill"
            style={
              i === idx
                ? { background: 'var(--ln-cyan)', color: 'var(--ln-text-on-cyan)', border: '1px solid transparent' }
                : i < idx
                  ? { background: 'transparent', color: 'var(--ln-ok)', border: '1px solid rgba(90,208,126,0.3)' }
                  : { background: 'transparent', color: 'var(--ln-text-muted)', border: '1px solid var(--ln-hairline-strong)' }
            }
          >
            {s}
          </span>
        </React.Fragment>
      ))}
    </div>
  )
}

export default function StepFooter({ step, description, inline = false }: StepFooterProps) {
  const idx = STEP_SEQUENCE.indexOf(step)
  return (
    <aside
      className={`step-footer ${inline ? 'step-footer--inline' : 'step-footer--strip'}`}
      data-testid="step-footer"
      data-step={step.toLowerCase()}
      aria-label={`Mission flow: ${step}, step ${idx + 1} of ${STEP_SEQUENCE.length}`}
      style={inline ? {
        display: 'flex', flexDirection: 'column',
        borderRadius: 8,
        background: 'var(--ln-shell, var(--ln-surface))',
        border: '1px solid var(--ln-hairline-strong)',
        // gap + padding live in the .step-footer--inline CSS class (globals.css)
        // instead of here so the mobile breakpoint can tighten them — an
        // inline style value can't be overridden by a media query.
      } : {
        // Centered strip, matching the Open Design shells (landnam-mission-board.html):
        // "STEP 1 OF 4" caption centered above a centered row of step pills.
        // It used to be a left-aligned two-line block crammed into the corner.
        position: 'absolute', left: 0, right: 0, bottom: 0, zIndex: 15,
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
        padding: 'var(--ln-s-3) var(--ln-s-5) var(--ln-s-4)',
        background: 'var(--ln-shell, var(--ln-surface))',
        borderTop: '1px solid var(--ln-hairline-strong)',
        textAlign: 'center',
      }}
    >
      <div className="step-footer-caption">
        Step {idx + 1} of {STEP_SEQUENCE.length}
      </div>
      <StepPills idx={idx} />
      <div className="step-footer-desc">
        {description}
      </div>
    </aside>
  )
}
