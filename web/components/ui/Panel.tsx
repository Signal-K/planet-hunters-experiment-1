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
  /** 'glass' = Open Design "Glass HUD" frosted surface (dark-tinted translucency,
   * not the literal white glass, to keep --ln-text legible — see globals.css). */
  surface?: 'solid' | 'glass'
  /** Native hover tooltip on the panel root — used sparingly for a quick
   * hover explanation (e.g. SkillTreeScreen's per-node tooltips) without a
   * dedicated tooltip component. */
  title?: string
}

export default function Panel({ children, style, accent = '#3fa9ff', variant = 'default', surface = 'solid', title }: PanelProps) {
  return (
    <div title={title} className={surface === 'glass' ? 'ln-glass-panel' : undefined} style={{
      position: 'relative',
      background: surface === 'glass' ? undefined : 'var(--ln-panel-2)',
      border: surface === 'glass' ? undefined : `1px solid ${accent}40`,
      borderRadius: 12,
      padding: variant === 'compact' ? 10 : 14,
      backdropFilter: surface === 'glass' ? undefined : 'blur(8px)',
      ...style,
    }}>
      <Corners c={accent} />
      {children}
    </div>
  )
}
