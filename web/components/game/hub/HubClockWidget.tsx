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
    <div data-testid="hub-clock-widget" className="scene-chip">
      <span style={{ display: 'flex' }}><ClockGlyph /></span>
      <span>{label}</span>
    </div>
  )
}
