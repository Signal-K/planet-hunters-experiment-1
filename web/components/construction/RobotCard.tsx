'use client'

import React from 'react'

export type RobotState = 'idle' | 'hauling' | 'building' | 'fault'

interface RobotCardProps {
  name: string
  glyph: string
  task: string
  state: RobotState
  onClick?: () => void
}

const STATE_COLOR: Record<RobotState, string> = {
  idle: 'var(--ln-text-muted)',
  hauling: 'var(--ln-cyan)',
  building: 'var(--ln-ok)',
  fault: 'var(--ln-crit)',
}

/** Construction Kit "robot card" primitive (KES-280) — fleet row for the pipeline console's Fleet tab. */
export default function RobotCard({ name, glyph, task, state, onClick }: RobotCardProps) {
  const color = STATE_COLOR[state]
  return (
    <div
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: 8,
        borderRadius: 6,
        cursor: onClick ? 'pointer' : 'default',
        background: 'var(--ln-panel-2)',
        border: `1px solid ${state === 'fault' ? 'var(--ln-crit)' : 'var(--ln-hairline)'}`,
      }}
    >
      <span
        style={{
          width: 28,
          height: 28,
          borderRadius: 6,
          display: 'grid',
          placeItems: 'center',
          flexShrink: 0,
          border: `1.5px solid ${color}`,
          color,
          font: '800 12px var(--ln-font-display)',
        }}
      >
        {glyph}
      </span>
      <span style={{ flex: 1, minWidth: 0 }}>
        <div style={{ font: '700 11px var(--ln-font-display)', color: 'var(--ln-text)' }}>{name}</div>
        <div style={{ font: '400 10px var(--ln-font-mono)', color: 'var(--ln-text-muted)' }}>{task}</div>
      </span>
      <span
        style={{
          font: '800 9.5px var(--ln-font-display)',
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          color,
          flexShrink: 0,
        }}
      >
        {state}
      </span>
    </div>
  )
}
