'use client'

import React from 'react'
import { IconBtn } from './Button'

interface TopBarProps {
  eyebrow?: string
  title?: string
  onBack?: () => void
  right?: React.ReactNode
  dense?: boolean
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

export default function TopBar({ eyebrow, title, onBack, right, dense }: TopBarProps) {
  return (
    <div style={{
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      zIndex: 20,
      padding: '18px 14px 12px 14px',
      background: 'linear-gradient(180deg, rgba(6,9,15,0.92) 0%, rgba(6,9,15,0.5) 70%, transparent 100%)',
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      pointerEvents: 'none',
    }}>
      <div style={{ pointerEvents: 'auto' }}>
        {onBack
          ? <IconBtn onClick={onBack} ariaLabel="back"><BackIcon /></IconBtn>
          : <IconBtn ariaLabel="menu"><MenuIcon /></IconBtn>
        }
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
      <div style={{ pointerEvents: 'auto', display: 'flex', gap: 6 }}>{right}</div>
    </div>
  )
}
