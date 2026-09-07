'use client'

import React from 'react'

interface SlotProps {
  state: 'empty' | 'active' | 'filled' | 'blocked'
  label?: string
  glyph?: string
  blockedReason?: string
  onClick?: () => void
  onClear?: () => void
}

/** Construction Kit "slots" primitive (KES-280) — module bay states for assembly scenes. */
export default function Slot({ state, label, glyph, blockedReason, onClick, onClear }: SlotProps) {
  if (state === 'blocked') {
    return (
      <div
        style={{
          height: 84,
          border: '1.5px solid var(--ln-crit)',
          borderRadius: 4,
          background: 'var(--ln-crit-soft)',
          display: 'grid',
          placeItems: 'center',
          textAlign: 'center',
          padding: '0 8px',
          font: '700 9px var(--ln-font-display)',
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          color: 'var(--ln-crit)',
        }}
      >
        {blockedReason ?? 'blocked'}
      </div>
    )
  }

  if (state === 'filled') {
    return (
      <div
        onClick={onClick}
        style={{
          position: 'relative',
          height: 84,
          cursor: onClick ? 'pointer' : 'default',
          border: '1.5px solid var(--ln-cyan-border)',
          borderRadius: 4,
          background: 'var(--ln-cyan-soft)',
          display: 'grid',
          placeItems: 'center',
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <div style={{ font: '700 17px var(--ln-font-mono)', color: 'var(--ln-cyan)' }}>{glyph ?? '◇'}</div>
          <div style={{ font: '800 9.5px var(--ln-font-display)', textTransform: 'uppercase', color: 'var(--ln-text)' }}>{label}</div>
        </div>
        {onClear && (
          <button
            aria-label="remove module"
            onClick={(e) => { e.stopPropagation(); onClear() }}
            style={{
              position: 'absolute',
              top: -6,
              right: -6,
              width: 19,
              height: 19,
              borderRadius: '50%',
              background: 'var(--ln-crit)',
              color: 'var(--ln-text-inverse)',
              border: 'none',
              font: '400 11px var(--ln-font-mono)',
              lineHeight: '18px',
              cursor: 'pointer',
            }}
          >
            ✕
          </button>
        )}
      </div>
    )
  }

  const active = state === 'active'
  return (
    <div
      onClick={onClick}
      style={{
        height: 84,
        cursor: onClick ? 'pointer' : 'default',
        border: `1.5px dashed ${active ? 'var(--ln-cyan)' : 'var(--ln-cyan-border)'}`,
        borderRadius: 4,
        background: active ? 'var(--ln-cyan-soft)' : 'transparent',
        display: 'grid',
        placeItems: 'center',
        font: '700 9px var(--ln-font-display)',
        letterSpacing: '0.12em',
        textTransform: 'uppercase',
        color: active ? 'var(--ln-cyan)' : 'var(--ln-text-muted)',
      }}
    >
      {active ? 'drop here' : (label ?? 'empty')}
    </div>
  )
}
