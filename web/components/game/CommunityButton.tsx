'use client'

import React from 'react'

interface CommunityButtonProps {
  onClick: () => void
}

/** Opens the Community Hub (SSL-320). Sits left of the Friends pill on the Earth Base. */
export default function CommunityButton({ onClick }: CommunityButtonProps) {
  return (
    <button
      className="hub-community-button"
      data-testid="community-button"
      aria-label="Community hub"
      onClick={onClick}
      style={{
        // Friends pill occupies right 96px..~196px; this sits just left of it.
        position: 'absolute', top: 56, right: 204, zIndex: 22,
        minHeight: 34, borderRadius: 999, cursor: 'pointer',
        display: 'flex', alignItems: 'center', gap: 8, padding: '0 12px',
        background: 'var(--ln-panel)',
        border: '1px solid var(--ln-hairline)',
        color: 'var(--ln-cyan)',
        fontFamily: 'var(--ln-font-display)', fontSize: 10, fontWeight: 800,
        letterSpacing: '0.12em',
      }}
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="9" />
        <path d="M3 12h18" />
        <path d="M12 3a14 14 0 0 1 0 18" />
        <path d="M12 3a14 14 0 0 0 0 18" />
      </svg>
      <span>HUB</span>
    </button>
  )
}
