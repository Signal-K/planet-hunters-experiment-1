'use client'

import React from 'react'

type PillKind = 'ok' | 'warn' | 'crit' | 'info' | 'amber' | 'mute'

interface StatusPillProps {
  kind?: PillKind
  children: React.ReactNode
  dim?: boolean
}

const TONES: Record<PillKind, { bg: string; fg: string }> = {
  ok:    { bg: 'rgba(57,211,106,0.18)',  fg: '#39d36a' },
  warn:  { bg: 'rgba(255,179,71,0.18)',  fg: '#ffb347' },
  crit:  { bg: 'rgba(255,90,106,0.18)',  fg: '#ff5a6a' },
  info:  { bg: 'rgba(112,217,234,0.18)', fg: '#7ec8ff' },
  amber: { bg: 'rgba(245,166,35,0.18)',  fg: '#f5a623' },
  mute:  { bg: 'rgba(169,184,206,0.10)', fg: '#7a8294' },
}

export default function StatusPill({ kind = 'ok', children, dim }: StatusPillProps) {
  const t = TONES[kind]
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 6,
      padding: '4px 10px',
      borderRadius: 999,
      background: t.bg,
      color: t.fg,
      fontFamily: 'var(--ln-font-display)',
      fontSize: 10,
      fontWeight: 700,
      letterSpacing: '0.18em',
      textTransform: 'uppercase',
      opacity: dim ? 0.7 : 1,
    }}>
      <span style={{
        width: 6,
        height: 6,
        borderRadius: 999,
        background: t.fg,
        boxShadow: `0 0 6px ${t.fg}`,
        flexShrink: 0,
      }} />
      {children}
    </span>
  )
}
