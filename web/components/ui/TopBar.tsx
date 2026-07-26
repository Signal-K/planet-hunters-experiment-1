'use client'

import React from 'react'
import { IconBtn } from './Button'
import { UI_ZONES } from '@/lib/ui-zones'
import { formatFrancs } from '@/lib/format'

interface TopBarProps {
  eyebrow?: string
  title?: string
  onBack?: () => void
  right?: React.ReactNode
  dense?: boolean
  // Fully opaque header instead of the default fade-to-transparent gradient.
  // The default gradient reads fine over a scenic/canvas background (Hub,
  // Mining), but on screens that scroll a dense list of text cards directly
  // underneath (Mission Board, Market, ...), the header's own title text
  // sits in the low-opacity tail of the gradient and the scrolled-past card
  // text shows straight through it — solid avoids that.
  solid?: boolean
  // Player level pill ("LV. 3") shown left of the title, per the design
  // doc's Topbar spec (§2.1: "[LV badge + icon] [Screen Title] ...
  // [Credit Balance]", consistent across all screens).
  levelBadge?: string
  // Credit balance chip shown at the far right, before any custom `right`
  // content. Omit to leave the balance off (most screens don't need it in
  // the header — they show francs elsewhere).
  credits?: number
}

function BackIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M15 18l-6-6 6-6"/>
    </svg>
  )
}

function MenuIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
      <line x1="3" y1="8" x2="21" y2="8"/>
      <line x1="3" y1="12" x2="21" y2="12"/>
      <line x1="3" y1="16" x2="21" y2="16"/>
    </svg>
  )
}

function ClockIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3.5 2" />
    </svg>
  )
}

function CoinIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <path d="M9.5 15.5V9.5a2 2 0 0 1 2-2h1a2 2 0 0 1 0 4h-3.5" />
    </svg>
  )
}

export default function TopBar({ eyebrow, title, onBack, right, dense, solid, levelBadge, credits }: TopBarProps) {
  return (
    <div data-ui-zone={UI_ZONES.topChrome} style={{
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      zIndex: 20,
      padding: '18px 14px 12px 14px',
      // Fully opaque (alpha 1, not e.g. 0.97) — verified against a live page
      // that even 3% transparency on a near-black background is visible as
      // faint bleed-through text behind bright card copy scrolling beneath it.
      background: solid
        ? 'var(--ln-shell)'
        : 'linear-gradient(180deg, var(--ln-shell) 0%, color-mix(in srgb, var(--ln-shell) 50%, transparent) 70%, transparent 100%)',
      borderBottom: solid ? '1px solid var(--ln-hairline)' : 'none',
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      pointerEvents: 'none',
    }}>
      <div style={{ pointerEvents: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
        {onBack
          ? <IconBtn onClick={onBack} ariaLabel="back" testId="top-bar-back"><BackIcon /></IconBtn>
          : <IconBtn ariaLabel="menu"><MenuIcon /></IconBtn>
        }
        {levelBadge && (
          <span style={{
            display: 'flex', alignItems: 'center', gap: 4,
            padding: '3px 8px', borderRadius: 999,
            border: '1px solid rgba(112,217,234,0.4)',
            background: 'rgba(112,217,234,0.08)',
            color: 'var(--ln-cyan)',
            fontFamily: 'var(--ln-font-display)', fontWeight: 800, fontSize: 9,
            letterSpacing: '0.08em', textTransform: 'uppercase', whiteSpace: 'nowrap',
          }}>
            <ClockIcon /> {levelBadge}
          </span>
        )}
      </div>
      <div style={{ flex: 1, pointerEvents: 'none' }}>
        {eyebrow && (
          <div style={{
            fontFamily: 'var(--ln-font-display)',
            fontSize: 9,
            fontWeight: 700,
            letterSpacing: '0.24em',
            textTransform: 'uppercase',
            color: 'var(--ln-text-muted)',
          }}>
            {eyebrow}
          </div>
        )}
        {title && (
          <h1 style={{
            margin: '2px 0 0 0',
            fontFamily: 'var(--ln-font-display)',
            fontSize: dense ? 18 : 22,
            fontWeight: 800,
            letterSpacing: '-0.01em',
            color: 'var(--ln-text)',
            lineHeight: 1,
            textShadow: '0 2px 8px rgba(0,0,0,0.5)',
          }}>
            {title}
          </h1>
        )}
      </div>
      <div style={{ pointerEvents: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}>
        {credits !== undefined && (
          <span style={{
            display: 'flex', alignItems: 'center', gap: 4,
            padding: '4px 9px', borderRadius: 999,
            border: '1px solid rgba(224,165,39,0.4)',
            background: 'rgba(224,165,39,0.08)',
            color: 'var(--ln-amber)',
            fontFamily: 'var(--ln-font-mono)', fontWeight: 800, fontSize: 11,
            whiteSpace: 'nowrap',
          }}>
            <CoinIcon /> {formatFrancs(credits)}
          </span>
        )}
        {right}
      </div>
    </div>
  )
}
