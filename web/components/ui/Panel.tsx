'use client'

import React from 'react'

interface CornersProps {
  c: string
}

function Corners({ c }: CornersProps) {
  const base: React.CSSProperties = {
    position: 'absolute',
    width: 10,
    height: 10,
  }
  return (
    <>
      <span style={{ ...base, top: -1, left: -1, borderTop: `1.5px solid ${c}`, borderLeft: `1.5px solid ${c}` }} />
      <span style={{ ...base, top: -1, right: -1, borderTop: `1.5px solid ${c}`, borderRight: `1.5px solid ${c}` }} />
      <span style={{ ...base, bottom: -1, left: -1, borderBottom: `1.5px solid ${c}`, borderLeft: `1.5px solid ${c}` }} />
      <span style={{ ...base, bottom: -1, right: -1, borderBottom: `1.5px solid ${c}`, borderRight: `1.5px solid ${c}` }} />
    </>
  )
}

interface PanelProps {
  children: React.ReactNode
  style?: React.CSSProperties
  accent?: string
  variant?: 'default' | 'compact'
}

export default function Panel({ children, style, accent = '#3fa9ff', variant = 'default' }: PanelProps) {
  return (
    <div style={{
      position: 'relative',
      background: 'linear-gradient(180deg, rgba(18,34,54,0.78) 0%, rgba(10,18,29,0.82) 100%)',
      border: `1px solid ${accent}40`,
      borderRadius: 12,
      padding: variant === 'compact' ? 10 : 14,
      backdropFilter: 'blur(8px)',
      ...style,
    }}>
      <Corners c={accent} />
      {children}
    </div>
  )
}
