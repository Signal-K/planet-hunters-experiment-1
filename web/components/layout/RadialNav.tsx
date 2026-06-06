'use client'

import React from 'react'
import type { Screen } from '@/game-context'
import { useGame } from '@/game-context'

interface NavItem {
  id: string
  label: string
  color: string
  glyph: React.ReactNode
}

interface RadialNavProps {
  current: string
  onNav: (id: string) => void
}

function HubGlyph() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 19c0-3 3-9 7-9s7 6 7 9"/>
      <circle cx="12" cy="9" r="2"/>
      <path d="M12 21c-1.5-1-2-2-2-3M12 21c1.5-1 2-2 2-3"/>
    </svg>
  )
}

function MissionsGlyph() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2"/>
      <line x1="8" y1="9" x2="16" y2="9"/>
      <line x1="8" y1="13" x2="16" y2="13"/>
      <line x1="8" y1="17" x2="12" y2="17"/>
    </svg>
  )
}

function AtlasGlyph() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <line x1="2" y1="12" x2="22" y2="12"/>
      <path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/>
    </svg>
  )
}

function RocketGlyph() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2L8 6H4l2 4-2 4h4l4 6 4-6h4l-2-4 2-4h-4L12 2z"/>
    </svg>
  )
}

function PlusIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
      <line x1="12" y1="5" x2="12" y2="19"/>
      <line x1="5" y1="12" x2="19" y2="12"/>
    </svg>
  )
}

const MENU: NavItem[] = [
  { id: 'hub',      label: 'Base',     color: '#39d36a', glyph: <HubGlyph /> },
  { id: 'missions', label: 'Missions', color: '#f5a623', glyph: <MissionsGlyph /> },
  { id: 'galaxy',   label: 'Atlas',    color: '#7ec8ff', glyph: <AtlasGlyph /> },
  { id: 'fab',      label: 'Build',    color: '#c084ff', glyph: <RocketGlyph /> },
]

export default function RadialNav({ current, onNav }: RadialNavProps) {
  const game = useGame()
  const open = game.menuOpen
  const setOpen = game.setMenuOpen
  const N = MENU.length
  const spread = 150
  const start = -90 - spread / 2
  const radius = 96

  return (
    <div style={{
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      zIndex: 40,
      height: 150,
      pointerEvents: 'none',
    }}>
      {open && (
        <div
          onClick={() => setOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            pointerEvents: 'auto',
            background: 'radial-gradient(60% 50% at 50% 100%, rgba(3,6,12,0.55), transparent 70%)',
          }}
        />
      )}

      {MENU.map((m, i) => {
        const ang = ((start + (spread / (N - 1)) * i) * Math.PI) / 180
        const dx = Math.cos(ang) * radius
        const dy = Math.sin(ang) * radius
        const active = current === m.id
        return (
          <button
            key={m.id}
            onClick={() => { onNav(m.id); setOpen(false) }}
            style={{
              position: 'absolute',
              left: '50%',
              bottom: 28,
              transform: open
                ? `translate(calc(-50% + ${dx}px), ${dy}px) scale(1)`
                : 'translate(-50%, 0) scale(0.2)',
              opacity: open ? 1 : 0,
              transition: `transform 360ms cubic-bezier(.34,1.56,.64,1) ${i * 45}ms, opacity 240ms ${i * 45}ms`,
              pointerEvents: open ? 'auto' : 'none',
              width: 54,
              height: 54,
              borderRadius: 999,
              border: 'none',
              padding: 0,
              cursor: 'pointer',
              background: 'transparent',
            }}
          >
            <span style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              width: 54,
              height: 54,
              borderRadius: 999,
              background: active
                ? `radial-gradient(circle at 32% 28%, ${m.color}, ${m.color}cc 70%, ${m.color}88)`
                : 'rgba(10,18,29,0.92)',
              border: `1.5px solid ${active ? '#fff' : m.color + '99'}`,
              boxShadow: active
                ? `0 0 0 2px ${m.color}55, 0 0 18px ${m.color}aa, 0 6px 14px rgba(0,0,0,0.5)`
                : `0 0 12px ${m.color}44, 0 6px 14px rgba(0,0,0,0.5)`,
              color: active ? '#06121f' : m.color,
              backdropFilter: 'blur(6px)',
            }}>
              {m.glyph}
            </span>
            <span style={{
              position: 'absolute',
              top: 'calc(100% + 4px)',
              left: '50%',
              transform: 'translateX(-50%)',
              fontFamily: 'var(--ln-font-display)',
              fontSize: 8,
              fontWeight: 800,
              letterSpacing: '0.16em',
              textTransform: 'uppercase',
              color: active ? '#fff' : m.color,
              whiteSpace: 'nowrap',
              textShadow: '0 1px 4px rgba(0,0,0,0.8)',
            }}>
              {m.label}
            </span>
          </button>
        )
      })}

      {/* Central hub button */}
      <button
        onClick={() => setOpen(!open)}
        style={{
          position: 'absolute',
          left: '50%',
          bottom: 24,
          transform: 'translateX(-50%)',
          width: 64,
          height: 64,
          borderRadius: 999,
          border: '2px solid rgba(255,255,255,0.85)',
          background: 'radial-gradient(circle at 32% 28%, #6cc2ff, #2d8de0 60%, #1c6ab8)',
          boxShadow: open
            ? '0 0 0 3px rgba(63,169,255,0.35), 0 0 26px rgba(63,169,255,0.8), 0 8px 18px rgba(0,0,0,0.6)'
            : '0 0 0 3px rgba(63,169,255,0.25), 0 0 18px rgba(63,169,255,0.55), 0 8px 18px rgba(0,0,0,0.6)',
          cursor: 'pointer',
          pointerEvents: 'auto',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'box-shadow 200ms',
        }}
      >
        <span style={{ position: 'absolute', inset: 6, borderRadius: 999, border: '1px solid rgba(255,255,255,0.4)' }} />
        <span style={{
          color: '#06121f',
          display: 'inline-flex',
          transition: 'transform 320ms cubic-bezier(.34,1.56,.64,1)',
          transform: open ? 'rotate(135deg)' : 'rotate(0deg)',
        }}>
          {open ? (
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round">
              <line x1="12" y1="5" x2="12" y2="19"/>
              <line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
          ) : (
            <HubGlyph />
          )}
        </span>
        {!open && (
          <span style={{
            position: 'absolute',
            inset: -2,
            borderRadius: 999,
            border: '2px solid rgba(108,194,255,0.6)',
            animation: 'radial-pulse 2.2s ease-out infinite',
          }} />
        )}
      </button>

      {open && (
        <button
          onClick={game.resetGame}
          style={{
            position: 'absolute',
            left: '50%',
            bottom: 120,
            transform: 'translateX(-50%)',
            background: 'rgba(255, 59, 48, 0.15)',
            border: '1px solid rgba(255, 59, 48, 0.3)',
            borderRadius: 6,
            padding: '4px 10px',
            cursor: 'pointer',
            pointerEvents: 'auto',
            fontFamily: 'var(--ln-font-display)',
            fontSize: 8,
            fontWeight: 800,
            color: '#ff4b40',
            textTransform: 'uppercase',
            letterSpacing: '0.12em',
            zIndex: 50,
          }}
        >
          Reset Progress
        </button>
      )}
    </div>
  )
}
