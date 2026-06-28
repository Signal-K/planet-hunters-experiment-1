'use client'

import { useState, useEffect } from 'react'
import CoachAvatar from '@/components/layout/CoachAvatar'
import CoachPointer from './CoachPointer'
import type { TutorialStep } from '@/lib/data'
import { reserved_rect } from '@/lib/tutorial-layout'
import { UI_ZONES } from '@/lib/ui-zones'
import { useIsDesktop } from '@/lib/hooks/useIsDesktop'

interface TutorialCoachProps {
  stepIndex: number
  steps: TutorialStep[]
  step: TutorialStep
  total: number
  onManualNext: () => void
  onSkip: () => void
}

export default function TutorialCoach({ stepIndex, steps, step, total, onManualNext, onSkip }: TutorialCoachProps) {
  const isDesktop = useIsDesktop()

  if (!step) return null
  const manual = !!step.manual
  const coachRail = reserved_rect(step.anchor === 'bottom' ? 'bottom' : 'top')

  const resolvedBody   = (isDesktop && step.desktopBody   !== undefined) ? step.desktopBody   : step.body
  const resolvedAction = (isDesktop && step.desktopAction !== undefined) ? step.desktopAction : step.action
  const resolvedCoachId = (isDesktop && step.desktopCoachId !== undefined) ? step.desktopCoachId : step.coachId

  // Set data-coach-target on <html> for CSS element highlighting (works across fixed/absolute boundaries)
  useEffect(() => {
    const html = document.documentElement
    if (resolvedCoachId) html.setAttribute('data-coach-target', resolvedCoachId)
    return () => { html.removeAttribute('data-coach-target') }
  }, [resolvedCoachId])

  const progress = (
    <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
      {steps.map((s, i) => (
        <span key={i} style={{
          width: i === stepIndex ? 18 : 6,
          height: 6,
          borderRadius: 999,
          background: i < stepIndex ? '#39d36a' : i === stepIndex ? '#f5a623' : 'rgba(135,207,250,0.2)',
          transition: 'all 250ms',
          flexShrink: 0,
        }} />
      ))}
    </div>
  )

  // ── Manual (full card) ──────────────────────────────────────────────────────
  if (manual) {
    return (
      <div style={{ position: 'absolute', inset: 0, zIndex: 96, pointerEvents: 'none' }} data-testid="tutorial-coach-overlay">
        {resolvedCoachId && <CoachPointer coachId={resolvedCoachId} />}
        <div
          data-ui-zone={UI_ZONES.tutorialRail}
          data-testid="tutorial-coach-block"
          style={{ position: 'absolute', left: 14, right: 14, top: coachRail.top, maxHeight: 160, zIndex: 98, pointerEvents: 'auto', overflowY: 'auto' }}
        >
          <div style={{
            background: 'linear-gradient(160deg, rgba(10,22,42,0.98) 0%, rgba(6,13,26,0.98) 100%)',
            border: '1px solid rgba(135,207,250,0.4)',
            borderRadius: 14,
            padding: '10px 12px 10px',
            boxShadow: '0 16px 48px rgba(0,0,0,0.7), 0 0 0 1px rgba(63,169,255,0.08)',
          }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
              <CoachAvatar size={36} talking />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                  <span style={{ fontFamily: 'var(--ln-font-display)', fontSize: 9, fontWeight: 800, letterSpacing: '0.22em', color: 'var(--ln-cyan)', textTransform: 'uppercase' }}>
                    Mission Coach
                  </span>
                  <span style={{ flex: 1 }} />
                  <span style={{ fontFamily: 'var(--ln-font-mono)', fontSize: 9, color: '#4a5a6e', letterSpacing: '0.1em' }}>
                    {stepIndex + 1} / {total}
                  </span>
                </div>
                <div style={{ fontFamily: 'var(--ln-font-display)', fontSize: 13, fontWeight: 800, color: '#e8f0ff', lineHeight: 1.2, marginBottom: 3 }}>
                  {step.title}
                </div>
                <div style={{ fontFamily: 'var(--ln-font-body)', fontSize: 11.5, color: '#9ab0c8', lineHeight: 1.4, wordBreak: 'break-word' }}>
                  {resolvedBody}
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 8 }}>
              {progress}
              <span style={{ flex: 1 }} />
              <button
                data-testid="coach-got-it-btn"
                onClick={onManualNext}
                style={{
                  padding: '8px 18px', borderRadius: 10, cursor: 'pointer', border: 'none',
                  background: 'linear-gradient(180deg, #6cc2ff 0%, #2d8de0 100%)',
                  color: '#06121f', fontFamily: 'var(--ln-font-display)', fontSize: 12, fontWeight: 800,
                  letterSpacing: '0.1em', textTransform: 'uppercase',
                  boxShadow: '0 3px 0 rgba(0,0,0,0.35), 0 0 16px rgba(63,169,255,0.3)',
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                }}
              >
                Got it <span style={{ fontSize: 14 }}>›</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ── Active instruction (compact card) ──────────────────────────────────────
  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 96, pointerEvents: 'none' }} data-testid="tutorial-coach-overlay">
      {resolvedCoachId && <CoachPointer coachId={resolvedCoachId} />}
      <div
        data-ui-zone={UI_ZONES.tutorialRail}
        data-testid="tutorial-coach-block"
        style={{
          position: 'absolute',
          left: 12, right: 12,
          top: coachRail.top,
          zIndex: 98,
          pointerEvents: 'auto',
        }}
      >
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          background: 'linear-gradient(160deg, rgba(10,22,42,0.97), rgba(6,13,26,0.97))',
          border: '1px solid rgba(245,166,35,0.55)',
          borderRadius: 14,
          padding: '9px 14px 9px 9px',
          boxShadow: '0 8px 28px rgba(0,0,0,0.55), 0 0 0 1px rgba(245,166,35,0.08)',
        }}>
          {/* Avatar */}
          <div style={{ flexShrink: 0 }}>
            <CoachAvatar size={36} talking />
          </div>

          {/* Text */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: 'var(--ln-font-display)', fontSize: 8, fontWeight: 800, letterSpacing: '0.22em', color: 'var(--ln-amber)', textTransform: 'uppercase', marginBottom: 2 }}>
              {step.title}
            </div>
            <div style={{ fontFamily: 'var(--ln-font-body)', fontSize: 12.5, color: '#deeeff', lineHeight: 1.25, wordBreak: 'break-word' }}>
              <span aria-hidden="true" style={{ color: 'var(--ln-amber)', fontWeight: 800, marginRight: 5 }}>›</span>
              {resolvedAction ?? ((isDesktop ? 'Click ' : 'Tap ') + step.cta)}
            </div>
          </div>

          {/* Progress */}
          <div style={{ flexShrink: 0 }}>
            {progress}
          </div>
        </div>
      </div>
    </div>
  )
}
