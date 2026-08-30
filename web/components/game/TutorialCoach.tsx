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
  // Hub owns a stacked title/HUD rail at every viewport. The old shared tutorial
  // rectangle started at 76px, which put the coach directly over the Jobs
  // chip and made the rest of the navigation look missing. Leave a small
  // gap below that chrome on the one screen with the extra HUD row.
  const coachRail = step.screen === 'hub'
    ? { top: 160, height: 150 }
    : reserved_rect(step.anchor === 'bottom' ? 'bottom' : 'top')

  const resolvedBody   = (isDesktop && step.desktopBody   !== undefined) ? step.desktopBody   : step.body
  const resolvedAction = (isDesktop && step.desktopAction !== undefined) ? step.desktopAction : step.action
  const resolvedCoachId = (isDesktop && step.desktopCoachId !== undefined) ? step.desktopCoachId : step.coachId
  // The desktop Hub instruction already names the Launchpad. A large ring
  // around the building duplicates that instruction and reads like a second
  // active state; mobile keeps its compact target ring for touch wayfinding.
  const showPointer = !(isDesktop && step.screen === 'hub')

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
          background: i < stepIndex ? '#39d36a' : i === stepIndex ? '#70d9ea' : 'rgba(112,217,234,0.2)',
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
        {resolvedCoachId && showPointer && <CoachPointer coachId={resolvedCoachId} />}
        <div
          data-ui-zone={UI_ZONES.tutorialRail}
          data-testid="tutorial-coach-block"
          style={{ position: 'absolute', left: 14, right: 14, top: coachRail.top, maxHeight: 160, zIndex: 98, pointerEvents: 'auto', overflowY: 'auto' }}
        >
          <div className="tutorial-coach-card tutorial-coach-card--manual" style={{
            background: 'linear-gradient(160deg, rgba(16,16,18,0.98) 0%, rgba(11,11,13,0.98) 100%)',
            border: '1px solid rgba(112,217,234,0.4)',
            borderRadius: 14,
            padding: '10px 12px 10px',
            boxShadow: '0 16px 48px rgba(0,0,0,0.7), 0 0 0 1px rgba(112,217,234,0.08)',
          }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
              <div className="tutorial-coach-avatar"><CoachAvatar size={isDesktop ? 36 : 32} talking /></div>
              <div className="tutorial-coach-copy" style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                  <span style={{ fontFamily: 'var(--ln-font-display)', fontSize: 9, fontWeight: 800, letterSpacing: '0.22em', color: 'var(--ln-cyan)', textTransform: 'uppercase' }}>
                    Mission Coach
                  </span>
                  <span style={{ flex: 1 }} />
                  <span style={{ fontFamily: 'var(--ln-font-mono)', fontSize: 9, color: '#4a5a6e', letterSpacing: '0.1em' }}>
                    {stepIndex + 1} / {total}
                  </span>
                </div>
                <div className="tutorial-coach-title" style={{ fontFamily: 'var(--ln-font-display)', fontSize: 13, fontWeight: 800, color: '#e8f0ff', lineHeight: 1.2, marginBottom: 3 }}>
                  {step.title}
                </div>
                <div className="tutorial-coach-body" style={{ fontFamily: 'var(--ln-font-body)', fontSize: 11.5, color: '#9ab0c8', lineHeight: 1.4, wordBreak: 'break-word' }}>
                  {resolvedBody}
                </div>
              </div>
            </div>
            <div className="tutorial-coach-controls" style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 8 }}>
              {progress}
              <span style={{ flex: 1 }} />
              <button
                data-testid="coach-skip-btn"
                onClick={onSkip}
                style={{
                  padding: '8px 12px', borderRadius: 10, cursor: 'pointer', border: '1px solid rgba(154,176,200,0.3)',
                  background: 'transparent',
                  color: '#9ab0c8', fontFamily: 'var(--ln-font-display)', fontSize: 11, fontWeight: 700,
                  letterSpacing: '0.1em', textTransform: 'uppercase',
                }}
              >
                Skip
              </button>
              <button
                data-testid="coach-got-it-btn"
                onClick={onManualNext}
                style={{
                  padding: '8px 18px', borderRadius: 10, cursor: 'pointer', border: 'none',
                  background: 'linear-gradient(180deg, #6cc2ff 0%, #2d8de0 100%)',
                  color: '#06121f', fontFamily: 'var(--ln-font-display)', fontSize: 12, fontWeight: 800,
                  letterSpacing: '0.1em', textTransform: 'uppercase',
                  boxShadow: '0 3px 0 rgba(0,0,0,0.35), 0 0 16px rgba(112,217,234,0.3)',
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

  // Direction the target element is relative to the card — passed to CoachPointer
  // so arrows render adjacent to the target button, not below the coach card.
  const resolvedDir = (isDesktop ? (step.desktopDir ?? step.dir) : step.dir) ?? undefined

  // ── Active instruction card ─────────────────────────────────────────────────
  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 96, pointerEvents: 'none' }} data-testid="tutorial-coach-overlay">
      {resolvedCoachId && showPointer && <CoachPointer coachId={resolvedCoachId} dir={resolvedDir} />}
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
        <div className="tutorial-coach-card" style={{
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          background: 'linear-gradient(160deg, rgba(16,16,18,0.98), rgba(11,11,13,0.98))',
          border: '1.5px solid rgba(112,217,234,0.7)',
          borderRadius: 16,
          padding: '12px 16px 12px 12px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.6), 0 0 24px rgba(112,217,234,0.12)',
        }}>
          {/* Pulsing glow is its own opacity-animated overlay rather than an
              animated box-shadow on this card — see .coach-glow-ring. */}
          <div className="coach-glow-ring" style={{ borderRadius: 16 }} />

          {/* Avatar */}
          <div className="tutorial-coach-avatar" style={{ flexShrink: 0 }}>
            <CoachAvatar size={isDesktop ? 44 : 36} talking />
          </div>

          {/* Text */}
          <div className="tutorial-coach-copy" style={{ flex: 1, minWidth: 0 }}>
              <div className="tutorial-coach-title" style={{ fontFamily: 'var(--ln-font-display)', fontSize: 10, fontWeight: 800, letterSpacing: '0.2em', color: 'var(--ln-cyan)', textTransform: 'uppercase', marginBottom: 4 }}>
              {step.title}
            </div>
            {resolvedBody && (
              <div className="tutorial-coach-body" style={{ fontFamily: 'var(--ln-font-body)', fontSize: 12.5, color: '#9ab0c8', lineHeight: 1.35, wordBreak: 'break-word', marginBottom: 4 }}>
                {resolvedBody}
              </div>
            )}
            <div className="tutorial-coach-action" style={{ fontFamily: 'var(--ln-font-body)', fontSize: 14, color: '#e8f4ff', lineHeight: 1.35, wordBreak: 'break-word' }}>
              {resolvedAction ?? ((isDesktop ? 'Click ' : 'Tap ') + step.cta)}
            </div>
          </div>

          {/* Progress + skip */}
          <div className="tutorial-coach-side" style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
            {progress}
            <button
              data-testid="coach-skip-btn"
              onClick={onSkip}
              style={{
                padding: '4px 8px', borderRadius: 8, cursor: 'pointer', border: '1px solid rgba(154,176,200,0.3)',
                background: 'transparent',
                color: '#9ab0c8', fontFamily: 'var(--ln-font-display)', fontSize: 9, fontWeight: 700,
                letterSpacing: '0.1em', textTransform: 'uppercase', whiteSpace: 'nowrap',
              }}
            >
              Skip
            </button>
          </div>
        </div>

      </div>
    </div>
  )
}
