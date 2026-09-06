'use client'

import React from 'react'
import { IconBtn } from './Button'
import { UI_ZONES } from '@/lib/ui-zones'
import { formatCurrency } from '@/lib/format'

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
  /** Scene screens (Earth Base, Launchpad) float their chrome over a rendered
   *  world rather than over scrolling copy, so the bleed-through `solid`
   *  exists to prevent is not a risk there — and an opaque bar cuts the scene
   *  off at a hard horizontal edge, which is what "the background continues
   *  behind and underneath the UI" was describing (KES-260). Frosted glass
   *  instead: the terrain stays visible through it, the text stays legible. */
  glass?: boolean
  /** A bright, opaque strip for daytime scene surfaces. */
  scene?: boolean
  // Player level pill ("LV. 3") shown left of the title, per the design
  // doc's Topbar spec (§2.1: "[LV badge + icon] [Screen Title] ...
  // [Credit Balance]", consistent across all screens).
  levelBadge?: string
  // Credit balance chip shown at the far right, before any custom `right`
  // content. Omit to leave the balance off (most screens don't need it in
  // the header — they show francs elsewhere).
  francs?: number
}

function BackIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M15 18l-6-6 6-6"/>
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

export default function TopBar({ eyebrow, title, onBack, right, dense, solid, glass, scene, levelBadge, francs }: TopBarProps) {
  return (
    <div data-ui-zone={UI_ZONES.topChrome} style={{
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      zIndex: 20,
      // DEV shortcuts occupy the upper-left corner in local builds. Screens
      // without a back control still need a reserved title start, otherwise
      // the badge sits on top of the eyebrow (most visible on Debrief).
      padding: `18px 14px 12px ${onBack ? 14 : 76}px`,
      // Fully opaque (alpha 1, not e.g. 0.97) — verified against a live page
      // that even 3% transparency on a near-black background is visible as
      // faint bleed-through text behind bright card copy scrolling beneath it.
      background: scene
        ? 'color-mix(in srgb, var(--ln-blueprint-paper) 90%, var(--ln-cyan))'
        : glass
        ? 'linear-gradient(180deg, rgba(6,14,26,0.58) 0%, rgba(6,14,26,0.28) 72%, transparent 100%)'
        : solid
          ? 'var(--ln-shell)'
          : 'linear-gradient(180deg, var(--ln-shell) 0%, color-mix(in srgb, var(--ln-shell) 50%, transparent) 70%, transparent 100%)',
      WebkitBackdropFilter: glass ? 'blur(12px) saturate(1.1)' : undefined,
      backdropFilter: glass ? 'blur(12px) saturate(1.1)' : undefined,
      borderBottom: solid || scene ? '2px solid var(--ln-cyan-border)' : 'none',
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      pointerEvents: 'none',
    }}>
      <div style={{ pointerEvents: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
        {/* Screens without a back action leave this slot empty. Account access
            is owned by the shared shell's persistent MENU control. */}
        {onBack && <IconBtn onClick={onBack} ariaLabel="back" testId="top-bar-back"><BackIcon /></IconBtn>}
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
        {francs !== undefined && (
          <span style={{
            display: 'flex', alignItems: 'center', gap: 4,
            padding: '4px 9px', borderRadius: 999,
            border: '1px solid rgba(224,165,39,0.4)',
            background: 'rgba(224,165,39,0.08)',
            color: 'var(--ln-amber)',
            fontFamily: 'var(--ln-font-mono)', fontWeight: 800, fontSize: 11,
            whiteSpace: 'nowrap',
          }}>
            <CoinIcon /> {formatCurrency(francs, { compact: true })}
          </span>
        )}
        {right}
      </div>
    </div>
  )
}
