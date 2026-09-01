'use client'

import React from 'react'

interface RuleCardProps {
  index: number
  active: boolean
  cond: string
  test: string
  act: string
  onToggle?: () => void
}

/** Construction Kit "rule card" primitive (KES-280) — plain-language if/then automation policy row (the kit's own recommended automation-policy surface). */
export default function RuleCard({ index, active, cond, test, act, onToggle }: RuleCardProps) {
  return (
    <div
      style={{
        borderRadius: 6,
        padding: 13,
        background: active ? 'var(--ln-panel)' : 'var(--ln-panel-2)',
        border: `1px ${active ? 'solid var(--ln-cyan-border)' : 'dashed var(--ln-hairline)'}`,
        opacity: active ? 1 : 0.6,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <span style={{ font: '700 10px var(--ln-font-display)', letterSpacing: '0.1em', textTransform: 'uppercase', color: active ? 'var(--ln-cyan)' : 'var(--ln-text-muted)' }}>
          {`rule 0${index} · ${active ? 'active' : 'paused'}`}
        </span>
        <span
          onClick={onToggle}
          role="switch"
          aria-checked={active}
          style={{
            width: 34,
            height: 18,
            borderRadius: 999,
            position: 'relative',
            cursor: onToggle ? 'pointer' : 'default',
            background: active ? 'var(--ln-ok-soft)' : 'var(--ln-hairline)',
            border: `1px solid ${active ? 'var(--ln-ok)' : 'var(--ln-hairline-strong)'}`,
          }}
        >
          <span
            style={{
              position: 'absolute',
              top: 1,
              [active ? 'right' : 'left']: 1,
              width: 14,
              height: 14,
              borderRadius: '50%',
              background: active ? 'var(--ln-ok)' : 'var(--ln-text-muted)',
            }}
          />
        </span>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8, font: '700 10.5px var(--ln-font-display)' }}>
        <span style={{ color: 'var(--ln-text-muted)', textTransform: 'uppercase', fontSize: 9 }}>if</span>
        <span style={{ padding: '5px 9px', borderRadius: 4, background: 'var(--ln-cyan-soft)', border: '1px solid var(--ln-cyan-border)', color: 'var(--ln-cyan)' }}>{cond}</span>
        <span style={{ color: 'var(--ln-text-dim)' }}>{test}</span>
        <span style={{ color: 'var(--ln-text-muted)', textTransform: 'uppercase', fontSize: 9 }}>then</span>
        <span style={{ padding: '5px 9px', borderRadius: 4, background: 'var(--ln-ok-soft)', border: '1px solid var(--ln-ok)', color: 'var(--ln-ok)' }}>{act}</span>
      </div>
    </div>
  )
}
