'use client'

import React from 'react'

export function Cloud({ style, dur = '60s', delay = '0s' }: { style?: React.CSSProperties; dur?: string; delay?: string }) {
  return (
    <div style={{ position: 'absolute', animation: `cloud-drift ${dur} linear infinite`, animationDelay: delay, ...style }}>
      <svg width="120" height="50" viewBox="0 0 120 50" fill="none">
        <ellipse cx="32" cy="32" rx="22" ry="14" fill="#ffffff" opacity="0.82"/>
        <ellipse cx="58" cy="26" rx="26" ry="16" fill="#ffffff" opacity="0.86"/>
        <ellipse cx="84" cy="30" rx="20" ry="12" fill="#ffffff" opacity="0.78"/>
        <ellipse cx="48" cy="36" rx="28" ry="10" fill="#ffffff" opacity="0.65"/>
      </svg>
    </div>
  )
}
