'use client'

import { useEffect, useState } from 'react'

// Self-contained "Mission Coach" walkthrough for the Academy management
// view — same shape as ObservatoryCoach.tsx (screen-local, localStorage-
// gated, NOT wired into the global M1-M3 TutorialCoach stepper), but
// restyled for AcademyScreen's theme-light surface (reference/menu-style
// screens use the light editorial theme per CLAUDE.md) instead of
// ObservatoryCoach's dark command-deck styling.
const STEPS = [
  {
    title: 'FUNDING KEEPS IT RUNNING',
    body: 'Every rostered astronaut costs daily upkeep. While funding is on, training and staffing keep running. Pause it and both stop until you restore it.',
  },
  {
    title: 'TRAIN OR HIRE',
    body: "Training a new candidate is free but takes real time. Hiring brings in an instant level-3 astronaut for francs, capped at 2 hires a week. Former crew you've let go can be re-hired at their mortgage value.",
  },
  {
    title: 'PUT THEM TO WORK',
    body: 'Assign a fit astronaut to the Refinery, Scanning Station, or Diplomacy Desk in Staffing for a passive bonus — faster processing, an extra scan, or better contract terms.',
  },
  {
    title: 'GROW THE PROGRAM',
    body: 'Research Crew Quarters to fly astronauts on missions, and share flight charts with trusted clients in Partners to build the affinity that unlocks more crew sources.',
  },
]

const STORAGE_KEY = 'landnam_academy_coach_seen_v1'

export function useAcademyCoach() {
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

// Floats over the top of the management view (the screen's root .game-screen
// wrapper is `position: absolute`, so this anchors to it) rather than sitting
// inline in the tab content — a player should see it immediately on first
// visit without it displacing the roster/training/hire panels beneath.
export default function AcademyCoach({ onDismiss }: { onDismiss: () => void }) {
  const [step, setStep] = useState(0)
  const current = STEPS[step]

  return (
    <div
      data-testid="academy-coach"
      style={{
        position: 'absolute',
        top: 78, left: 14, right: 14, zIndex: 70,
        background: 'var(--ln-surface)',
        border: '1.5px solid var(--ln-cyan-border)',
        borderRadius: 12,
        padding: '14px 16px',
        boxShadow: '0 16px 40px rgba(28,26,20,0.18)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
        <div style={{
          width: 26, height: 26, flexShrink: 0, borderRadius: '50%',
          border: '1.5px solid var(--ln-cyan)', background: 'var(--ln-cyan-soft)',
          display: 'grid', placeItems: 'center',
        }}>
          <div style={{ width: 9, height: 9, borderRadius: '50%', border: '1.5px solid var(--ln-cyan-bright)' }} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: 'var(--ln-font-display)', fontSize: 9, fontWeight: 700, letterSpacing: '0.14em', color: 'var(--ln-cyan)', textTransform: 'uppercase' }}>
            Mission Coach · {step + 1}/{STEPS.length}
          </div>
          <div style={{ fontFamily: 'var(--ln-font-display)', fontSize: 14, fontWeight: 800, letterSpacing: '0.01em', color: 'var(--ln-text)', textTransform: 'uppercase', lineHeight: 1.15 }}>
            {current.title}
          </div>
        </div>
        <button
          data-testid="academy-coach-skip"
          onClick={onDismiss}
          style={{ fontFamily: 'var(--ln-font-display)', fontSize: 10, letterSpacing: '0.08em', color: 'var(--ln-text-muted)', background: 'none', border: 'none', cursor: 'pointer', textTransform: 'uppercase', padding: 4 }}
        >
          Skip
        </button>
      </div>
      <div style={{ fontFamily: 'var(--ln-font-body)', fontSize: 12.5, color: 'var(--ln-text-muted)', lineHeight: 1.5, marginBottom: 12 }}>
        {current.body}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', gap: 6 }}>
          {STEPS.map((_, i) => (
            <span key={i} style={{
              width: 6, height: 6, borderRadius: '50%',
              background: i < step ? 'var(--ln-cyan)' : i === step ? 'var(--ln-cyan-bright)' : 'var(--ln-divider)',
              boxShadow: i === step ? '0 0 6px var(--ln-cyan-border)' : 'none',
            }} />
          ))}
        </div>
        <button
          data-testid="academy-coach-next"
          onClick={() => (step < STEPS.length - 1 ? setStep(s => s + 1) : onDismiss())}
          style={{
            fontFamily: 'var(--ln-font-display)', fontSize: 11, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase',
            background: 'var(--ln-cyan-soft)', color: 'var(--ln-cyan)', border: '1px solid var(--ln-cyan-border)', borderRadius: 8, padding: '6px 14px', cursor: 'pointer',
          }}
        >
          {step === STEPS.length - 1 ? 'Got It' : 'Next ›'}
        </button>
      </div>
    </div>
  )
}
