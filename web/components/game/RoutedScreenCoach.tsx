'use client'

import { useState } from 'react'
import { UI_ZONES } from '@/lib/ui-zones'

export interface RoutedScreenCoachStep {
  title: string
  body: string
}

interface RoutedScreenCoachProps {
  steps: RoutedScreenCoachStep[]
  onDismiss: () => void
  testId: string
  /** Academy is theme-light, Asteroid Discovery/Observatory are theme-deep. */
  tone: 'light' | 'deep'
  finalLabel?: string
}

const TONE = {
  light: {
    background: 'var(--ln-surface)',
    border: '1.5px solid var(--ln-cyan-border)',
    shadow: '0 10px 28px rgba(28,26,20,0.14)',
    title: 'var(--ln-text)',
    body: 'var(--ln-text-muted)',
    dotOff: 'var(--ln-divider)',
    nextBg: 'var(--ln-cyan-soft)',
    nextColor: 'var(--ln-cyan)',
    nextBorder: '1px solid var(--ln-cyan-border)',
  },
  deep: {
    background: 'linear-gradient(160deg, rgba(16,16,18,0.98), rgba(11,11,13,0.98))',
    border: '1.5px solid rgba(245,166,35,0.7)',
    shadow: '0 12px 34px rgba(0,0,0,0.45)',
    title: '#e8f0fe',
    body: 'var(--ln-text-dim)',
    dotOff: 'rgba(112,217,234,0.2)',
    nextBg: 'linear-gradient(180deg,#6cc2ff,#2d8de0)',
    nextColor: '#06121f',
    nextBorder: 'none',
  },
} as const

// A shared, non-overlaying coach shell. Unlike the AcademyCoach/AsteroidDiscoveryCoach/
// ObservatoryCoach precedents it replaces (all `position: absolute` overlays that cover
// the scene beneath them), this renders as a normal in-flow block tagged with the
// `tutorialRail` zone so it reserves real height instead of floating over content.
export default function RoutedScreenCoach({ steps, onDismiss, testId, tone, finalLabel = 'Got It' }: RoutedScreenCoachProps) {
  const [step, setStep] = useState(0)
  const current = steps[step]
  const palette = TONE[tone]

  return (
    <div
      data-testid={testId}
      data-ui-zone={UI_ZONES.tutorialRail}
      style={{
        background: palette.background,
        border: palette.border,
        borderRadius: 12,
        padding: '10px 12px',
        margin: '0 var(--ln-s-4) var(--ln-s-2)',
        boxShadow: palette.shadow,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
        <div style={{
          width: 24, height: 24, flexShrink: 0, borderRadius: '50%',
          border: '1.5px solid var(--ln-cyan)', background: 'var(--ln-cyan-soft)',
          display: 'grid', placeItems: 'center',
        }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', border: '1.5px solid var(--ln-cyan-bright)' }} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: 'var(--ln-font-display)', fontSize: 9, fontWeight: 700, letterSpacing: '0.14em', color: 'var(--ln-cyan)', textTransform: 'uppercase' }}>
            Mission Coach · {step + 1}/{steps.length}
          </div>
          <div style={{ fontFamily: 'var(--ln-font-display)', fontSize: 13, fontWeight: 800, letterSpacing: '0.01em', color: palette.title, textTransform: 'uppercase', lineHeight: 1.15 }}>
            {current.title}
          </div>
        </div>
        <button
          data-testid={`${testId}-skip`}
          onClick={onDismiss}
          style={{ fontFamily: 'var(--ln-font-display)', fontSize: 10, letterSpacing: '0.08em', color: 'var(--ln-text-muted)', background: 'none', border: 'none', cursor: 'pointer', textTransform: 'uppercase', padding: 4, minHeight: 32 }}
        >
          Skip
        </button>
      </div>
      <div style={{ fontFamily: 'var(--ln-font-body)', fontSize: 12, color: palette.body, lineHeight: 1.45, marginBottom: 10 }}>
        {current.body}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', gap: 6 }}>
          {steps.map((_, i) => (
            <span key={i} style={{
              width: 6, height: 6, borderRadius: '50%',
              background: i < step ? 'var(--ln-cyan)' : i === step ? 'var(--ln-cyan-bright)' : palette.dotOff,
              boxShadow: i === step ? '0 0 6px var(--ln-cyan-border)' : 'none',
            }} />
          ))}
        </div>
        <button
          data-testid={`${testId}-next`}
          onClick={() => (step < steps.length - 1 ? setStep(s => s + 1) : onDismiss())}
          style={{
            fontFamily: 'var(--ln-font-display)', fontSize: 11, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase',
            background: palette.nextBg, color: palette.nextColor, border: palette.nextBorder, borderRadius: 8, padding: '6px 14px', cursor: 'pointer', minHeight: 32,
          }}
        >
          {step === steps.length - 1 ? finalLabel : 'Next ›'}
        </button>
      </div>
    </div>
  )
}
