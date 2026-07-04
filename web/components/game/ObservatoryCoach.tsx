'use client'

import { useEffect, useState } from 'react'

// Self-contained "Mission Coach" walkthrough for the Observatory chart —
// modeled on Landnam.html's coach card (glowing bordered tooltip, 4 steps,
// dot progress, Got It/Skip). Deliberately NOT wired into the global
// M1-M3 onboarding stepper (TutorialCoach.tsx / coachSteps) — that system
// expects a GameProvider-scoped step list; this is a narrower, screen-local
// beat shown once (persisted in localStorage) the first time a player opens
// the Observatory.
const STEPS = [
  {
    title: 'YOUR SATELLITE IS WATCHING',
    body: 'This is a raw TESS lightcurve — a stream of brightness from an orbiting telescope. Each point is a single measurement of the target star.',
  },
  {
    title: 'SPOT THE DIP',
    body: "A transiting planet blocks a fraction of starlight. Look for where the flux drops below the baseline — that's a potential transit. You'll need at least two dips to measure the orbital period.",
  },
  {
    title: 'DRAW THE TRANSIT',
    body: 'Press and drag across a dip to mark it. The width of your selection sets the ingress and egress. Mark a second dip to calculate the period.',
  },
  {
    title: 'CHECK THE PHYSICS',
    body: "Once you've marked two transits, the readout below derives planet radius, equilibrium temperature, and whether the world lands in the habitable zone.",
  },
]

const STORAGE_KEY = 'landnam_observatory_coach_seen_v1'

// Whether the coach should show, and how to dismiss it — lifted out so the
// parent screen can render it as a floating overlay (not inline in the
// panel stack, which is what caused the earlier mobile overlap with
// sticky-actions) *and* without reserving scroll padding for it (that made
// the chart/viewport feel squashed — see Liam 2026-07-03: "the viewport
// should dominate more of the display"). It just covers the top of the
// screen for a few taps, then goes away; nothing interactive sits there.
export function useObservatoryCoach() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    try {
      if (!window.localStorage.getItem(STORAGE_KEY)) setVisible(true)
    } catch {
      // localStorage unavailable (private mode, etc.) — just skip the coach
    }
  }, [])

  function dismiss() {
    setVisible(false)
    try { window.localStorage.setItem(STORAGE_KEY, '1') } catch { /* ignore */ }
  }

  return { visible, dismiss }
}

// Floats over the top of the screen (per Landnam.html's own `.coach`
// pattern and this codebase's tutorial-rail contract), not inline in the
// panel stack — see useObservatoryCoach above for why.
export default function ObservatoryCoach({ onDismiss }: { onDismiss: () => void }) {
  const [step, setStep] = useState(0)
  const current = STEPS[step]

  return (
    <div
      data-testid="observatory-coach"
      style={{
        position: 'absolute',
        top: 70, left: 10, right: 10, zIndex: 60,
        background: 'linear-gradient(160deg, rgba(10,22,42,0.98), rgba(6,13,26,0.98))',
        border: '1.5px solid rgba(245,166,35,0.7)',
        borderRadius: 12,
        padding: '9px 11px',
        boxShadow: '0 16px 48px rgba(0,0,0,0.5)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
        <div style={{
          width: 22, height: 22, flexShrink: 0, borderRadius: '50%',
          border: '1.5px solid var(--ln-cyan)', background: 'rgba(63,169,255,0.08)',
          display: 'grid', placeItems: 'center',
        }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', border: '1.5px solid var(--ln-cyan-bright)' }} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: 'var(--ln-font-display)', fontSize: 8, fontWeight: 700, letterSpacing: '0.12em', color: 'var(--ln-cyan)', textTransform: 'uppercase' }}>
            Mission Coach · {step + 1}/{STEPS.length}
          </div>
          <div style={{ fontFamily: 'var(--ln-font-display)', fontSize: 12, fontWeight: 800, letterSpacing: '0.02em', color: '#e8f0fe', textTransform: 'uppercase', lineHeight: 1.1 }}>
            {current.title}
          </div>
        </div>
        <button
          onClick={onDismiss}
          style={{ fontFamily: 'var(--ln-font-display)', fontSize: 8, letterSpacing: '0.08em', color: 'var(--ln-text-muted)', background: 'none', border: 'none', cursor: 'pointer', textTransform: 'uppercase', padding: 2 }}
        >
          Skip
        </button>
      </div>
      <div style={{ fontFamily: 'var(--ln-font-body)', fontSize: 10.5, color: 'var(--ln-text-dim)', lineHeight: 1.35, marginBottom: 7 }}>
        {current.body}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', gap: 5 }}>
          {STEPS.map((_, i) => (
            <span key={i} style={{
              width: 6, height: 6, borderRadius: '50%',
              background: i < step ? 'var(--ln-ok)' : i === step ? 'var(--ln-cyan)' : 'rgba(63,169,255,0.2)',
              boxShadow: i === step ? '0 0 6px rgba(63,169,255,0.6)' : 'none',
            }} />
          ))}
        </div>
        <button
          onClick={() => (step < STEPS.length - 1 ? setStep(s => s + 1) : onDismiss())}
          style={{
            fontFamily: 'var(--ln-font-display)', fontSize: 10, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase',
            background: 'linear-gradient(180deg,#6cc2ff,#2d8de0)', color: '#06121f', border: 'none', borderRadius: 7, padding: '5px 13px', cursor: 'pointer',
          }}
        >
          {step === STEPS.length - 1 ? 'Start ›' : 'Got It ›'}
        </button>
      </div>
    </div>
  )
}
