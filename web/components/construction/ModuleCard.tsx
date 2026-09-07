'use client'

import React from 'react'

interface ModuleCardProps {
  name: string
  cost: string
  glyph: string
  state: 'available' | 'installed' | 'locked'
  lockedNote?: string
  onClick?: () => void
}

/** Construction Kit "module cards" primitive (KES-280) — catalogue row for the assembly scene's parts tray. */
export default function ModuleCard({ name, cost, glyph, state, lockedNote, onClick }: ModuleCardProps) {
  const locked = state === 'locked'
  const installed = state === 'installed'
  const accent = locked ? 'var(--ln-text-muted)' : installed ? 'var(--ln-ok)' : 'var(--ln-cyan)'

  return (
    <div
      onClick={locked ? undefined : onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '11px 14px 11px 10px',
        borderRadius: 6,
        cursor: locked ? 'not-allowed' : onClick ? 'pointer' : 'default',
        border: `1px solid ${installed ? 'var(--ln-ok)' : locked ? 'var(--ln-hairline)' : 'var(--ln-cyan-border)'}`,
        background: installed ? 'var(--ln-ok-soft)' : locked ? 'var(--ln-panel-2)' : 'var(--ln-cyan-soft)',
        opacity: locked ? 0.55 : 1,
      }}
    >
      <span
        style={{
          width: 30,
          height: 30,
          borderRadius: 4,
          display: 'grid',
          placeItems: 'center',
          border: `1.5px solid ${accent}`,
          color: accent,
          font: '700 15px var(--ln-font-mono)',
          flexShrink: 0,
        }}
      >
        {glyph}
      </span>
      <span style={{ flex: 1, minWidth: 0 }}>
        <div style={{ font: '700 11px var(--ln-font-display)', letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--ln-text)' }}>{name}</div>
        <div style={{ font: '400 10px var(--ln-font-mono)', color: 'var(--ln-text-muted)' }}>{locked ? (lockedNote ?? 'locked') : cost}</div>
      </span>
      <span style={{ font: '700 10px var(--ln-font-display)', letterSpacing: '0.08em', textTransform: 'uppercase', color: accent, flexShrink: 0 }}>
        {locked ? 'locked' : installed ? '✓ in' : 'add'}
      </span>
    </div>
  )
}
