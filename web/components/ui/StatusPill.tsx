'use client'

import React from 'react'

type PillKind = 'ok' | 'warn' | 'crit' | 'info' | 'amber' | 'mute'

interface StatusPillProps {
  kind?: PillKind
  children: React.ReactNode
  dim?: boolean
}

const TONES: Record<PillKind, { bg: string; fg: string }> = {
  ok:    { bg: 'var(--ln-bp-green-soft, rgba(23,112,63,0.10))', fg: 'var(--ln-bp-green, #17703f)' },
  warn:  { bg: 'var(--ln-bp-blue-soft, rgba(31,120,193,0.08))', fg: 'var(--ln-bp-ink, #0f2436)' },
  crit:  { bg: 'var(--ln-bp-pink-soft, rgba(200,41,62,0.10))',  fg: 'var(--ln-bp-pink, #c8293e)' },
  info:  { bg: 'var(--ln-bp-blue-soft, rgba(31,120,193,0.08))', fg: 'var(--ln-bp-ink, #0f2436)' },
  amber: { bg: 'var(--ln-bp-blue-soft, rgba(31,120,193,0.08))', fg: 'var(--ln-bp-ink-dim, #48596a)' },
  mute:  { bg: 'var(--ln-bp-blue-soft, rgba(31,120,193,0.08))', fg: 'var(--ln-bp-ink-mute, #566879)' },
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
      fontSize: 14,
      fontWeight: 700,
      letterSpacing: '0.18em',
      textTransform: 'uppercase',
      opacity: dim ? 0.97 : 1,
    }}>
      <span style={{
        width: 6,
        height: 6,
        borderRadius: 999,
        background: t.fg,
        flexShrink: 0,
      }} />
      {children}
    </span>
  )
}
