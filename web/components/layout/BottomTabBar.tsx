'use client'

import React from 'react'
import { useGame } from '@/game-context'
import { UI_ZONES } from '@/lib/ui-zones'

interface NavItem {
  id: string
  label: string
  color: string
  glyph: React.ReactNode
  locked?: boolean
}

interface BottomTabBarProps {
  current: string
  onNav: (id: string) => void
}

function HubGlyph() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 19c0-3 3-9 7-9s7 6 7 9"/>
      <circle cx="12" cy="9" r="2"/>
      <path d="M12 21c-1.5-1-2-2-2-3M12 21c1.5-1 2-2 2-3"/>
    </svg>
  )
}

function MissionsGlyph() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2"/>
      <line x1="8" y1="9" x2="16" y2="9"/>
      <line x1="8" y1="13" x2="16" y2="13"/>
      <line x1="8" y1="17" x2="12" y2="17"/>
    </svg>
  )
}

function AtlasGlyph() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <line x1="2" y1="12" x2="22" y2="12"/>
      <path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/>
    </svg>
  )
}

function MarketGlyph() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 10h16l-2-6H6l-2 6z"/>
      <path d="M5 10v10h14V10"/>
      <path d="M9 20v-6h6v6"/>
    </svg>
  )
}

function LockGlyph() {
  return (
    <svg width="7" height="7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <rect x="5" y="11" width="14" height="9" rx="1.5"/>
      <path d="M8 11V7a4 4 0 018 0v4"/>
    </svg>
  )
}

// Missions/Market previously used #f5a623 (exactly --ln-amber) and #ffb347
// (--ln-warn, an amber-family orange) — plain nav chrome, not the genuine
// payout/reward emphasis the design rule restricts amber to. Moved both onto
// the cyan family instead, matching the amber->cyan default-accent swap
// already done in MissionBoardScreen/MissionCard/RocketPurchaseScreen.
//
// Corrected 2026-08-22 (KES-228): Base/Atlas previously each had their
// own hardcoded hue (green #39d36a, blue #7ec8ff, purple #c084ff) — a
// rainbow of unrelated colors nobody had reskinned since long before the
// Out There/Crashlands dark-navy-and-cyan direction (KES-219/226) took over
// every screen this bar sits below. Sitting directly under the new Hub
// dock, that leftover rainbow read as the one piece of chrome nobody had
// touched. One consistent accent (cyan) across every tab, matching the rest
// of the app's single-accent language.
const MENU: NavItem[] = [
  { id: 'hub',      label: 'Base',     color: 'var(--ln-cyan)', glyph: <HubGlyph /> },
  { id: 'missions', label: 'Missions', color: 'var(--ln-cyan)', glyph: <MissionsGlyph /> },
  { id: 'galaxy',   label: 'Atlas',    color: 'var(--ln-cyan)', glyph: <AtlasGlyph /> },
  { id: 'market',   label: 'Market',   color: 'var(--ln-cyan-bright)', glyph: <MarketGlyph /> },
]

export default function BottomTabBar({ current, onNav }: BottomTabBarProps) {
  const game = useGame()

  return (
    <div className="bottom-tab-bar" data-ui-zone={UI_ZONES.bottomNav}>
      {MENU.map(m => {
        const active = current === m.id
        const locked = (m.locked || m.id === 'market') && !game.player.freeOperations
        const color = locked ? 'var(--ln-text-muted)' : m.color

        return (
          <button
            key={m.id}
            data-testid={`bottom-tab-${m.id}`}
            data-coach-id={m.id === 'missions' ? 'bottom-tab-missions' : undefined}
            onClick={() => !locked && onNav(m.id)}
            aria-disabled={locked}
            style={{
              flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              gap: 3, background: 'transparent', border: 'none', padding: '8px 2px 6px', position: 'relative',
              cursor: locked ? 'not-allowed' : 'pointer', opacity: locked ? 0.55 : 1,
            }}
          >
            {active && (
              <span style={{ position: 'absolute', top: 0, left: '30%', right: '30%', height: 2, background: m.color, borderRadius: 2 }} />
            )}
            <span style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', width: 30, height: 30, borderRadius: 999,
              background: active ? `radial-gradient(circle at 32% 28%, ${m.color}, ${m.color}cc 70%)` : 'transparent',
              border: active ? '1.5px solid #fff' : 'none',
              boxShadow: active ? `0 0 0 2px ${m.color}55, 0 0 12px ${m.color}aa` : 'none',
              color: active ? '#06121f' : color, position: 'relative',
            }}>
              {m.glyph}
              {locked && (
                <span style={{
                  position: 'absolute', top: -3, right: -3, width: 12, height: 12, borderRadius: 999,
                  background: 'var(--ln-surface-2)', border: '1px solid var(--ln-hairline-strong)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--ln-text-muted)',
                }}>
                  <LockGlyph />
                </span>
              )}
            </span>
            <span style={{
              fontFamily: 'var(--ln-font-display)', fontSize: 8, fontWeight: 800, letterSpacing: '0.1em',
              textTransform: 'uppercase', color: active ? m.color : color,
            }}>
              {m.label}
            </span>
          </button>
        )
      })}
    </div>
  )
}
