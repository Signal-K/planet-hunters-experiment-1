'use client'

import { useEffect, useState } from 'react'

// Self-contained "Mission Coach" walkthrough for the Scan Station, modeled
// on ObservatoryCoach.tsx / AcademyCoach.tsx. Deliberately NOT wired into
// the global M1-M3 onboarding stepper — this is a narrower, screen-local
// beat shown once (persisted in localStorage) the first time a player
// opens the Scan Station. KES-129: the screen shipped with real mechanics
// but no rationale for why a player would bother scanning before landing.
const STEPS = [
  {
    title: 'SCOUT BEFORE YOU LAND',
    body: 'A remote scan surveys a target from orbit — no rocket required. It reveals mineral deposits and terrain before you commit a launch to it.',
  },
  {
    title: 'THREE SCANS TO MAP',
    body: 'Each target needs 3 completed scans to fully map its deposits and grant landing clearance. Partial scans still reveal a fraction of what is down there.',
  },
  {
    title: 'A LIMITED DAILY RESOURCE',
    body: 'You get 5 scans per day (6 once the Scan Station is staffed by Academy crew). Each scan takes 10 minutes and also earns Research XP on collection.',
  },
]

const STORAGE_KEY = 'landnam_scan_station_coach_seen_v1'

export function useScanStationCoach() {
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

export default function ScanStationCoach({ onDismiss }: { onDismiss: () => void }) {
  const [step, setStep] = useState(0)
  const current = STEPS[step]

  return (
    <div
      data-testid="scan-station-coach"
      style={{
        position: 'absolute',
        top: 70, left: 10, right: 10, zIndex: 60,
        background: 'linear-gradient(160deg, rgba(16,16,18,0.98), rgba(11,11,13,0.98))',
        border: '1.5px solid rgba(112,217,234,0.7)',
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
          data-testid="scan-station-coach-skip"
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
          data-testid="scan-station-coach-next"
          onClick={() => (step < STEPS.length - 1 ? setStep(s => s + 1) : onDismiss())}
          style={{
            fontFamily: 'var(--ln-font-display)', fontSize: 10, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase',
            background: 'linear-gradient(180deg,#6cc2ff,#2d8de0)', color: '#06121f', border: 'none', borderRadius: 7, padding: '5px 13px', cursor: 'pointer',
          }}
        >
          {step === STEPS.length - 1 ? 'Got It ›' : 'Next ›'}
        </button>
      </div>
    </div>
  )
}
