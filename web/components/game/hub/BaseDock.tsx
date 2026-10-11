'use client'

import { UI_ZONES } from '@/lib/ui-zones'

type BaseDockProps = {
  onPrev: () => void
  onNext: () => void
  onBuild: () => void
  onHub: () => void
}

/** Dock controls. Arrows sit at the ends; Build and Hub sit in the middle. */
export const BASE_DOCK_CONTROLS = ['prev', 'build', 'hub', 'next'] as const
export const BASE_DOCK_GAP = 8
export const BASE_DOCK_PADDING = 6

const WORD = {
  minHeight: 32,
  minWidth: 64,
  background: 'transparent',
  border: '1px solid transparent',
  borderRadius: 4,
  padding: '4px 10px',
  fontFamily: 'var(--ln-font-display)',
  fontWeight: 800,
  fontSize: 14,
  letterSpacing: '0.08em',
  textTransform: 'uppercase' as const,
  color: 'var(--ln-world-outline)',
  cursor: 'pointer',
}

const ARROW = {
  width: 32,
  height: 32,
  minWidth: 32,
  minHeight: 32,
  borderRadius: 4,
  border: '1px solid var(--ln-world-outline)',
  background: 'var(--ln-world-hull-lit)',
  color: 'var(--ln-world-outline)',
  cursor: 'pointer',
  display: 'grid',
  placeItems: 'center',
  padding: 0,
}

function Arrow({ direction }: { direction: 'left' | 'right' }) {
  const d = direction === 'left' ? 'M14 6 L8 12 L14 18' : 'M10 6 L16 12 L10 18'
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={d} />
    </svg>
  )
}

/** Floating dock: previous at the far left, Build and Hub in the middle, next at the far right. */
export function BaseDock({ onPrev, onNext, onBuild, onHub }: BaseDockProps) {
  return (
    <nav
      aria-label="Scene dock"
      data-ui-zone={UI_ZONES.bottomNav}
      data-testid="base-dock"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: BASE_DOCK_GAP,
        padding: 2,
        width: '100%',
      }}
    >
      <button type="button" style={ARROW} data-testid="hub-dock-prev" onClick={onPrev} aria-label="Previous">
        <Arrow direction="left" />
      </button>
      <div style={{ display: 'flex', alignItems: 'center', gap: BASE_DOCK_GAP }}>
        <button type="button" style={WORD} data-testid="hub-build-btn" data-beacon="hub-build-btn" onClick={onBuild}>Build</button>
        <button type="button" style={WORD} data-testid="hub-btn" onClick={onHub}>Hub</button>
      </div>
      <button type="button" style={ARROW} data-testid="hub-dock-next" onClick={onNext} aria-label="Next">
        <Arrow direction="right" />
      </button>
    </nav>
  )
}
