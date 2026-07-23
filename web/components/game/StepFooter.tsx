'use client'

import React from 'react'

// Persistent "what to do next" wayfinding strip for the Mission → Target →
// Rocket → Relay flow — Core Principle #1 in the Mission Board Craft doc
// ("it should be extremely clear what to do next... current step
// description/title in the footer"). Real player feedback (PostHog M1/M3
// surveys, 2026-07-18–20) named "knowing where to go next" and "understanding
// the scanner" as the hardest friction points, and this footer had not
// actually shipped on any of these screens — see Craft doc "Mission Board:
// De-Toying the Open Design Prototype (Hybrid Direction Research)".
//
// The 4th step is "Relay," never "Transit" — those are not interchangeable
// words in this codebase. "Transit" is already the real-science term for
// TESS's transit-photometry exoplanet detection (subjectType 'transit',
// transitSatelliteLevel, the "CONFIRM TRANSIT" verdict in
// TessDiscoveryScreen.tsx — see ZenNotes "Sprint 10 discoveries realism
// boundary"). "Relay" is this sequence's actual 4th step, matching the Craft
// doc's Mission → Target → Rocket → Relay and the OD-derived preview's
// STAGE_ORDER in components/game/previews/MissionFlowPreview.tsx (its
// "relay" stage shows satellite/TESS status — "SMS-01 Vesta track ready" —
// right before the player commits to launch). A rocket being sent to mine or
// build never "enters Transit" in the player-facing sense; the flight itself
// (TransitScreen.tsx, after launch) sits outside this pre-launch stepper
// entirely, matching the OD preview's 4-item stage list.
export const MISSION_FLOW_STEPS = ['Mission', 'Target', 'Rocket', 'Relay'] as const
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

export default function StepFooter({ step, description, inline = false }: StepFooterProps) {
  const idx = STEP_SEQUENCE.indexOf(step)
  return (
    <aside
      data-testid="step-footer"
      data-step={step.toLowerCase()}
      aria-label={`Mission flow: ${step}, step ${idx + 1} of ${STEP_SEQUENCE.length}`}
      style={inline ? {
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '8px 12px',
        borderRadius: 8,
        background: 'var(--ln-shell, var(--ln-surface))',
        border: '1px solid var(--ln-hairline-strong)',
      } : {
        position: 'absolute', left: 0, right: 0, bottom: 0, zIndex: 15,
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '10px 14px',
        background: 'var(--ln-shell, var(--ln-surface))',
        borderTop: '1px solid var(--ln-hairline-strong)',
      }}
    >
      <div style={{ display: 'flex', gap: 4, flex: 'none' }} aria-hidden="true">
        {STEP_SEQUENCE.map((s, i) => (
          <span
            key={s}
            style={{
              width: 6, height: 6, borderRadius: 999,
              background: i <= idx ? 'var(--ln-cyan)' : 'var(--ln-hairline-strong)',
            }}
          />
        ))}
      </div>
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{
          fontFamily: 'var(--ln-font-display)', fontSize: 9, fontWeight: 800,
          letterSpacing: '0.18em', color: 'var(--ln-cyan)', textTransform: 'uppercase',
        }}>
          Step {idx + 1} of {STEP_SEQUENCE.length} · {step}
        </div>
        <div style={{
          fontFamily: 'var(--ln-font-body)', fontSize: 11, color: 'var(--ln-text-dim)',
          opacity: 0.8, lineHeight: 1.35,
          display: '-webkit-box', WebkitBoxOrient: 'vertical', WebkitLineClamp: 2,
          overflow: 'hidden',
        }}>
          {description}
        </div>
      </div>
    </aside>
  )
}
