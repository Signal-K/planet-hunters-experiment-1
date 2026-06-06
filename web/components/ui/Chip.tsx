'use client'

import React from 'react'

interface ChipProps {
  children: React.ReactNode
  amber?: boolean
}

export default function Chip({ children, amber }: ChipProps) {
  return (
    <div style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 6,
      padding: '4px 10px',
      background: 'rgba(8,16,28,0.78)',
      backdropFilter: 'blur(6px)',
      border: `1px solid ${amber ? 'rgba(245,166,35,0.55)' : 'rgba(63,169,255,0.35)'}`,
      borderRadius: 999,
      fontFamily: 'var(--ln-font-display)',
      fontSize: 11,
      fontWeight: 700,
      letterSpacing: '0.14em',
      color: amber ? '#f5a623' : '#cde4ff',
      textTransform: 'uppercase',
    }}>
      {children}
    </div>
  )
}
