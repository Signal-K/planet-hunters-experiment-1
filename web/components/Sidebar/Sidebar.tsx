'use client'

import React from 'react'
import { useGame } from '@/game-context'

interface NavItem {
  id: string
  label: string
  color: string
  glyph: React.ReactNode
  locked?: boolean
}

function HubGlyph() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 19c0-3 3-9 7-9s7 6 7 9"/>
      <circle cx="12" cy="9" r="2"/>
      <path d="M12 21c-1.5-1-2-2-2-3M12 21c1.5-1 2-2 2-3"/>
    </svg>
  )
}

function MissionsGlyph() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2"/>
      <line x1="8" y1="9" x2="16" y2="9"/>
      <line x1="8" y1="13" x2="16" y2="13"/>
      <line x1="8" y1="17" x2="12" y2="17"/>
    </svg>
  )
}

function AtlasGlyph() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <line x1="2" y1="12" x2="22" y2="12"/>
      <path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/>
    </svg>
  )
}

function RocketGlyph() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2L8 6H4l2 4-2 4h4l4 6 4-6h4l-2-4 2-4h-4L12 2z"/>
    </svg>
  )
}

function MarketGlyph() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 10h16l-2-6H6l-2 6z"/>
      <path d="M5 10v10h14V10"/>
      <path d="M9 20v-6h6v6"/>
    </svg>
  )
}

const NAV_ITEMS: NavItem[] = [
  { id: 'hub',      label: 'Base',     color: 'var(--ln-ok)', glyph: <HubGlyph /> },
  { id: 'missions', label: 'Missions', color: 'var(--ln-amber)', glyph: <MissionsGlyph /> }, // amber allowed - nav identity
  { id: 'galaxy',   label: 'Atlas',    color: 'var(--ln-cyan-bright)', glyph: <AtlasGlyph /> },
  { id: 'fab',      label: 'Build',    color: 'var(--ln-crit)', glyph: <RocketGlyph />, locked: true },
  { id: 'market',   label: 'Market',   color: 'var(--ln-warn)', glyph: <MarketGlyph />, locked: true },
]

function GearGlyph() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3"/>
      <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/>
    </svg>
  )
}

interface SidebarProps {
  current: string
  onNav: (id: string) => void
  onSettings: () => void
}

export default function Sidebar({ current, onNav, onSettings }: SidebarProps) {
  const game = useGame()

  return (
    <nav className="desktop-sidebar" aria-label="Desktop navigation">
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
        padding: '16px 8px',
        flex: 1,
      }}>
        {NAV_ITEMS.map((item) => {
          const active = current === item.id
          const locked = item.locked && !game.player.freeOperations
          const itemColor = locked ? '#5d7390' : item.color
          return (
            <button
              key={item.id}
              data-testid={`sidebar-nav-${item.id}`}
              data-coach-id={item.id === 'missions' ? 'sidebar-missions' : undefined}
              onClick={() => { if (!locked) onNav(item.id) }}
              aria-disabled={locked}
              aria-current={active ? 'page' : undefined}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                width: '100%',
                padding: '10px 4px',
                borderRadius: 8,
                border: active
                  ? `1px solid ${item.color}66`
                  : '1px solid transparent',
                background: active
                  ? `radial-gradient(circle at 50% 30%, ${item.color}22, ${item.color}0d)`
                  : 'transparent',
                color: active ? item.color : itemColor,
                cursor: locked ? 'not-allowed' : 'pointer',
                opacity: locked ? 0.5 : 1,
                transition: 'background 140ms, border-color 140ms, color 140ms',
              }}
            >
              <span style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 36,
                height: 36,
                borderRadius: 8,
                background: active
                  ? `radial-gradient(circle at 35% 30%, ${item.color}, ${item.color}cc 70%, ${item.color}88)`
                  : 'rgba(24,24,28,0.72)',
                border: `1.5px solid ${active ? '#ffffff33' : itemColor + '44'}`,
                boxShadow: active
                  ? `0 0 12px ${item.color}66`
                  : `0 0 8px ${itemColor}22`,
                color: active ? '#06121f' : itemColor,
                flexShrink: 0,
              }}>
                {item.glyph}
              </span>
              <span style={{
                fontFamily: 'var(--ln-font-display)',
                fontSize: 8,
                fontWeight: 800,
                letterSpacing: '0.16em',
                textTransform: 'uppercase',
                color: active ? item.color : itemColor,
                whiteSpace: 'nowrap',
              }}>
                {item.label}
              </span>
            </button>
          )
        })}
      </div>

      {/* Settings — pinned to bottom */}
      <div style={{ padding: '0 8px 16px' }}>
        <button
          data-testid="sidebar-nav-settings"
          onClick={onSettings}
          style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            justifyContent: 'center', gap: 6, width: '100%', padding: '10px 4px',
            borderRadius: 8, border: '1px solid transparent',
            background: 'transparent', color: '#5d7390',
            cursor: 'pointer', transition: 'background 140ms, color 140ms',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = '#a9b8ce' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#5d7390' }}
        >
          <span style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: 36, height: 36, borderRadius: 8,
            background: 'rgba(24,24,28,0.72)', border: '1.5px solid rgba(255,255,255,0.08)',
            color: 'inherit', flexShrink: 0,
          }}>
            <GearGlyph />
          </span>
          <span style={{
            fontFamily: 'var(--ln-font-display)', fontSize: 8, fontWeight: 800,
            letterSpacing: '0.16em', textTransform: 'uppercase', color: 'inherit', whiteSpace: 'nowrap',
          }}>
            Settings
          </span>
        </button>
      </div>
    </nav>
  )
}
