'use client'

import { useEffect, useState } from 'react'

// Screen-local "Mission Coach" for the Deep Space Telescope's NEOCP feed
// (KES-128) — modeled directly on ScanStationCoach.tsx/ObservatoryCoach.tsx.
// Deliberately NOT wired into the global M1-M3 onboarding stepper; this is a
// narrower, first-open-only beat for the AsteroidDiscoveryScreen.
//
// Copy stays strictly factual (repo narrative rule: real science, real
// terminology, no fictional wrapper on mainline content) — this is a live
// read of the actual Minor Planet Center NEOCP, not a story beat.
const STEPS = [
  {
    title: 'A REAL UNCONFIRMED OBJECT FEED',
    body: "Every candidate here comes from the Minor Planet Center's Near-Earth Object Confirmation Page — objects seen once or twice that haven't been confirmed yet. Nothing here is simulated.",
  },
  {
    title: 'YOUR CALL FEEDS FOLLOW-UP',
    body: 'Real observatories use the same score, arc, and magnitude data shown here to decide which candidates are worth chasing before they drop off the page.',
  },
  {
    title: 'FLAG, MARK, OR SKIP',
    body: '"Flag Likely Real" prioritises a candidate for follow-up. "Mark Artifact" flags it as a probable satellite glint, cosmic ray, or processing error. "Skip" leaves it unresolved for today.',
  },
]

const STORAGE_KEY = 'landnam_asteroid_discovery_coach_seen_v1'

export function useAsteroidDiscoveryCoach() {
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

export default function AsteroidDiscoveryCoach({ onDismiss }: { onDismiss: () => void }) {
  const [step, setStep] = useState(0)
  const current = STEPS[step]

  return (
    <div
      data-testid="asteroid-discovery-coach"
      style={{
        position: 'absolute',
        top: 70, left: 10, right: 10, zIndex: 60,
        background: 'linear-gradient(160deg, rgba(16,16,18,0.98), rgba(11,11,13,0.98))',
        border: '1.5px solid rgba(245,166,35,0.7)',
        borderRadius: 12,
        padding: '9px 11px',
        boxShadow: '0 16px 48px rgba(0,0,0,0.5)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
        <div style={{
          width: 22, height: 22, flexShrink: 0, borderRadius: '50%',
          border: '1.5px solid var(--ln-cyan)', background: 'rgba(112,217,234,0.08)',
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
          data-testid="asteroid-discovery-coach-skip"
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
              background: i < step ? 'var(--ln-ok)' : i === step ? 'var(--ln-cyan)' : 'rgba(112,217,234,0.2)',
              boxShadow: i === step ? '0 0 6px rgba(112,217,234,0.6)' : 'none',
            }} />
          ))}
        </div>
        <button
          data-testid="asteroid-discovery-coach-next"
          onClick={() => (step < STEPS.length - 1 ? setStep(s => s + 1) : onDismiss())}
          style={{
            fontFamily: 'var(--ln-font-display)', fontSize: 10, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase',
            background: 'linear-gradient(180deg,#6cc2ff,#2d8de0)', color: '#06121f', border: 'none', borderRadius: 7, padding: '5px 13px', cursor: 'pointer',
          }}
        >
          {step === STEPS.length - 1 ? 'Start ›' : 'Next'}
        </button>
      </div>
    </div>
  )
}
