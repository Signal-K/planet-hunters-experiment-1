'use client'

import React from 'react'

interface BuildQueueRowProps {
  index: string
  name: string
  sub: string
  /** Countdown text (e.g. "2:40"), or omit for a completed row. */
  eta?: string
  complete?: boolean
  onCancel?: () => void
}

/** Construction Kit "build queue row" primitive (KES-280) — pending/queued/complete build list item. */
export default function BuildQueueRow({ index, name, sub, eta, complete, onCancel }: BuildQueueRowProps) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '8px 12px',
        borderRadius: 6,
        background: complete ? 'var(--ln-ok-soft)' : 'var(--ln-panel-2)',
        border: `1px solid ${complete ? 'var(--ln-ok)' : 'var(--ln-hairline)'}`,
      }}
    >
      <span style={{ font: '800 11px var(--ln-font-mono)', color: complete ? 'var(--ln-ok)' : 'var(--ln-text-muted)', flexShrink: 0, width: 16, textAlign: 'center' }}>
        {complete ? '✓' : index}
      </span>
      <span style={{ flex: 1, minWidth: 0 }}>
        <div style={{ font: '700 11px var(--ln-font-display)', color: 'var(--ln-text)' }}>{name}</div>
        <div style={{ font: '400 10px var(--ln-font-mono)', color: 'var(--ln-text-muted)' }}>{sub}</div>
      </span>
      {!complete && eta && <span style={{ font: '400 11px var(--ln-font-mono)', color: 'var(--ln-cyan)', flexShrink: 0 }}>{eta}</span>}
      {!complete && onCancel && (
        <button
          aria-label="cancel"
          onClick={onCancel}
          style={{ border: 'none', background: 'transparent', color: 'var(--ln-crit)', cursor: 'pointer', font: '400 13px var(--ln-font-mono)', flexShrink: 0 }}
        >
          ✕
        </button>
      )}
    </div>
  )
}
