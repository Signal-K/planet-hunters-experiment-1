'use client'

import React from 'react'

interface BlueprintCardProps {
  name: string
  sub: string
  onClick?: () => void
}

/** Construction Kit "blueprint card" primitive (KES-280) — a saved module layout, shown with a small schematic preview. */
export default function BlueprintCard({ name, sub, onClick }: BlueprintCardProps) {
  return (
    <div
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: 12,
        borderRadius: 6,
        cursor: onClick ? 'pointer' : 'default',
        background: 'var(--ln-panel-2)',
        border: '1px solid var(--ln-hairline)',
      }}
    >
      <svg width="60" height="39" viewBox="0 0 120 78" style={{ flexShrink: 0 }}>
        <rect x="18" y="18" width="22" height="16" fill="var(--ln-cyan-soft)" stroke="var(--ln-cyan)" />
        <rect x="70" y="44" width="22" height="16" fill="var(--ln-cyan-soft)" stroke="var(--ln-cyan)" />
        <path d="M40 26 H58 V52 H70" stroke="var(--ln-cyan)" fill="none" strokeWidth={1.5} />
      </svg>
      <div>
        <div style={{ font: '700 11px var(--ln-font-display)', textTransform: 'uppercase', color: 'var(--ln-text)' }}>{name}</div>
        <div style={{ font: '400 10px var(--ln-font-mono)', color: 'var(--ln-text-muted)' }}>{sub}</div>
      </div>
    </div>
  )
}
