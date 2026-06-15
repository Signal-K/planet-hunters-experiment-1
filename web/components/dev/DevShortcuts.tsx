'use client'

import { useState } from 'react'
import { DEV_GROUPS } from '@/lib/devPresets'

export default function DevShortcuts() {
  const [open, setOpen] = useState(false)

  function jump(key: string) {
    const url = new URL(window.location.href)
    url.searchParams.set('preset', key)
    window.location.href = url.toString()
  }

  return (
    <div style={{ position: 'absolute', top: 8, left: 8, zIndex: 999, userSelect: 'none' }}>
      <button
        data-testid="dev-shortcuts-toggle"
        onClick={() => setOpen(o => !o)}
        style={{
          padding: '3px 8px',
          background: open ? '#1a2e1a' : '#0e1a0e',
          border: '1px solid #3a7a3a',
          borderRadius: 6,
          color: '#5aff5a',
          fontFamily: 'var(--ln-font-mono)',
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: '0.12em',
          cursor: 'pointer',
          opacity: 0.8,
        }}
      >
        {open ? '✕ DEV' : '⚡ DEV'}
      </button>

      {open && (
        <div style={{
          position: 'absolute',
          top: 28,
          left: 0,
          background: '#060d18',
          border: '1px solid #1a2e3a',
          borderRadius: 10,
          padding: '8px 0 6px',
          minWidth: 220,
          maxHeight: 'calc(100dvh - 80px)',
          overflowY: 'auto',
          boxShadow: '0 8px 32px rgba(0,0,0,0.8)',
        }}>
          <div data-testid="dev-shortcuts-panel" style={{ padding: '0 12px 6px', fontFamily: 'var(--ln-font-mono)', fontSize: 9, letterSpacing: '0.2em', color: '#2a5a2a', textTransform: 'uppercase' }}>
            Scene One-Shots
          </div>

          {DEV_GROUPS.map((group, gi) => (
            <div key={group.label}>
              {gi > 0 && <div style={{ height: 1, background: '#0d1f2e', margin: '4px 0' }} />}

              <div style={{ padding: '4px 12px 2px', display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 6, height: 6, borderRadius: 999, background: group.color, flexShrink: 0 }} />
                <span data-testid={`dev-group-${group.label.toLowerCase().replace(/\s+/g, '-')}`} style={{ fontFamily: 'var(--ln-font-display)', fontSize: 9, fontWeight: 800, letterSpacing: '0.2em', color: group.color, textTransform: 'uppercase' }}>
                  {group.label}
                </span>
              </div>

              <div style={{ padding: '2px 10px 2px', display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {group.shots.map(shot => (
                  <button
                    key={shot.key}
                    data-testid={`dev-shot-${shot.key}`}
                    onClick={() => jump(shot.key)}
                    title={shot.hint}
                    style={{
                      padding: '4px 10px',
                      background: '#0a1624',
                      border: `1px solid ${group.color}44`,
                      borderRadius: 6,
                      color: group.color,
                      fontFamily: 'var(--ln-font-display)',
                      fontSize: 11,
                      fontWeight: 700,
                      letterSpacing: '0.08em',
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = `${group.color}18`; e.currentTarget.style.borderColor = `${group.color}88` }}
                    onMouseLeave={e => { e.currentTarget.style.background = '#0a1624'; e.currentTarget.style.borderColor = `${group.color}44` }}
                  >
                    {shot.label}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
