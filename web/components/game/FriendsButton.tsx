'use client'

import React from 'react'

interface FriendsButtonProps {
  onClick: () => void
}

export default function FriendsButton({ onClick }: FriendsButtonProps) {
  return (
    <button
      data-testid="friends-button"
      aria-label="Friends"
      onClick={onClick}
      style={{
        position: 'absolute', left: 54, bottom: 56, zIndex: 22,
        width: 34, height: 34, borderRadius: 999, cursor: 'pointer',
        display: 'grid', placeItems: 'center', padding: 0,
        background: 'var(--hub-panel, #080d18)',
        border: '1.5px solid var(--hub-outline, rgba(255,255,255,0.55))',
        color: 'var(--hub-cyan, #6cd4ff)',
      }}
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    </button>
  )
}
