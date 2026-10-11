'use client'

import React from 'react'
import { useTimeOfDay } from '@/lib/hooks/useTimeOfDay'

function ClockGlyph() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 3" />
    </svg>
  )
}

/** Small local-time readout for Earth Base (KES-231), pairs with the sky's time-of-day sync. */
export function HubClockWidget() {
  const { label } = useTimeOfDay()
  return (
    <div
      data-testid="hub-clock-widget"
      style={{
        display: 'flex', alignItems: 'center', gap: 6, minHeight: 44, boxSizing: 'border-box',
        background: 'var(--dusk-panel)', border: '2px solid color-mix(in srgb, var(--dusk-ink) 45%, transparent)',
        borderRadius: 999, padding: '0 12px', flexShrink: 0,
      }}
    >
      <span style={{ color: 'var(--dusk-ink)', display: 'flex' }}><ClockGlyph /></span>
      <span style={{
        fontFamily: 'var(--ln-font-mono)', fontSize: 14, fontWeight: 700,
        letterSpacing: '0.06em', color: 'var(--dusk-ink)',
      }}>
        {label}
      </span>
    </div>
  )
}
