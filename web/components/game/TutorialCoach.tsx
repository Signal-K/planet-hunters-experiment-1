'use client'

import React, { useState } from 'react'
import CoachAvatar from '@/components/layout/CoachAvatar'
import type { TutorialStep } from '@/lib/data'

interface TutorialCoachProps {
  stepIndex: number
  steps: TutorialStep[]
  step: TutorialStep
  total: number
  onManualNext: () => void
  onSkip: () => void
}

export default function TutorialCoach({ stepIndex, steps, step, total, onManualNext, onSkip }: TutorialCoachProps) {
  const [collapsed, setCollapsed] = useState(false)
  if (!step) return null
  const manual = !!step.manual
  const compactTop = step.screen === 'build'
    ? 92
    : step.screen === 'targets'
      ? undefined
      : (step.anchor === 'top' ? 84 : undefined)
  const compactBottom = step.screen === 'targets'
    ? 12
    : compactTop == null ? 110 : undefined

  const dots = (
    <div style={{ display: 'flex', gap: 4 }}>
      {steps.map((s, i) => (
        <span key={i} style={{
          width: i === stepIndex ? 16 : 6,
          height: 6,
          borderRadius: 999,
          background: i < stepIndex ? '#39d36a' : i === stepIndex ? '#f5a623' : 'rgba(135,207,250,0.25)',
          transition: 'all 200ms',
        }} />
      ))}
    </div>
  )

  if (manual) {
    const cardTop = step.anchor === 'top' ? 150 : step.anchor === 'center' ? 330 : 520
    return (
      <div style={{ position: 'absolute', inset: 0, zIndex: 80, pointerEvents: 'none' }}>
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(3,6,12,0.45)' }} />
        <div style={{ position: 'absolute', left: 14, right: 14, top: cardTop, zIndex: 82, pointerEvents: 'auto' }}>
          <div style={{
            background: 'linear-gradient(180deg, #0d1c30 0%, #081120 100%)',
            border: '1px solid rgba(135,207,250,0.5)',
            borderRadius: 16,
            padding: 14,
            boxShadow: '0 12px 36px rgba(0,0,0,0.6), 0 0 24px rgba(63,169,255,0.25)',
          }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
              <CoachAvatar size={40} talking />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontFamily: 'var(--ln-font-display)', fontSize: 9, fontWeight: 800, letterSpacing: '0.2em', color: '#87CFFA', textTransform: 'uppercase' }}>Mission Coach</span>
                  <span style={{ flex: 1 }} />
                  <span style={{ fontFamily: 'var(--ln-font-mono)', fontSize: 10, color: '#7a8294', letterSpacing: '0.12em' }}>{stepIndex + 1} / {total}</span>
                </div>
                <div style={{ fontFamily: 'var(--ln-font-display)', fontSize: 15, fontWeight: 800, color: '#e6efff', marginTop: 4 }}>{step.title}</div>
                <div style={{ fontFamily: 'var(--ln-font-body)', fontSize: 13, color: '#a9b8ce', marginTop: 4, lineHeight: 1.45 }}>{step.body}</div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12 }}>
              {dots}
              <span style={{ flex: 1 }} />
              <button onClick={onSkip} style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontFamily: 'var(--ln-font-display)', fontSize: 10, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: '#5d7390' }}>Skip</button>
              <button onClick={onManualNext} style={{
                padding: '8px 16px', borderRadius: 10, cursor: 'pointer', border: 'none',
                background: 'linear-gradient(180deg, #6cc2ff, #2d8de0)', color: '#06121f',
                fontFamily: 'var(--ln-font-display)', fontSize: 12, fontWeight: 800,
                letterSpacing: '0.1em', textTransform: 'uppercase', boxShadow: '0 3px 0 rgba(0,0,0,0.3)',
                display: 'inline-flex', alignItems: 'center', gap: 6,
              }}>Got it <span>›</span></button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 80, pointerEvents: 'none' }}>
      <div style={{
        position: 'absolute',
        left: 12,
        right: 12,
        top: compactTop,
        bottom: compactBottom,
        zIndex: 82,
        pointerEvents: 'none'
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          background: 'linear-gradient(180deg, rgba(13,28,48,0.96), rgba(8,17,32,0.96))',
          border: '1px solid rgba(245,166,35,0.5)', borderRadius: 999,
          padding: '7px 12px 7px 7px',
          boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
        }}>
          <button onClick={() => setCollapsed(c => !c)} style={{ background: 'transparent', border: 'none', padding: 0, cursor: 'pointer', flexShrink: 0, pointerEvents: 'auto' }}>
            <CoachAvatar size={34} talking={!collapsed} />
          </button>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontFamily: 'var(--ln-font-display)', fontSize: 8, fontWeight: 800, letterSpacing: '0.2em', color: '#f5a623', textTransform: 'uppercase' }}>{step.title}</span>
              <span style={{ flex: 1 }} />
              <span style={{ fontFamily: 'var(--ln-font-mono)', fontSize: 9, color: '#7a8294' }}>{stepIndex + 1}/{total}</span>
            </div>
            <div style={{ fontFamily: 'var(--ln-font-body)', fontSize: 12, color: '#dfe9f7', lineHeight: 1.25, marginTop: 1, whiteSpace: 'normal', overflow: 'visible' }}>
              <span aria-hidden="true" style={{ color: 'var(--ln-amber)', marginRight: 4 }}>›</span>
              {step.action ?? ('Tap ' + step.cta)}
            </div>
          </div>
          <button onClick={onSkip} style={{ flexShrink: 0, background: 'transparent', border: 'none', cursor: 'pointer', fontFamily: 'var(--ln-font-display)', fontSize: 9, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#5d7390', pointerEvents: 'auto' }}>Skip</button>
        </div>
        <div style={{ marginTop: 6, display: 'flex', justifyContent: 'center' }}>{dots}</div>
      </div>
    </div>
  )
}
