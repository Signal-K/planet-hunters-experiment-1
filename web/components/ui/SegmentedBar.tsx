'use client'

import React from 'react'

type SegmentedBarTone = 'cyan' | 'amber' | 'ok' | 'crit'

interface SegmentedBarProps {
  segments: number
  filled: number
  tone?: SegmentedBarTone
  height?: number
  style?: React.CSSProperties
}

const TONES: Record<SegmentedBarTone, string> = {
  cyan: 'var(--ln-cyan)',
  amber: 'var(--ln-amber)',
  ok: 'var(--ln-ok)',
  crit: 'var(--ln-crit)',
}

// Out There: Omega segmented pip/bar meter — used for depleting/filling
// readouts (laser charges, order progress) instead of a smooth gradient bar.
export default function SegmentedBar({ segments, filled, tone = 'cyan', height = 8, style }: SegmentedBarProps) {
  const color = TONES[tone]
  const lit = Math.max(0, Math.min(segments, Math.round(filled)))
  return (
    <div style={{ display: 'flex', gap: 2, ...style }}>
      {Array.from({ length: segments }, (_, i) => (
        <span
          key={i}
          style={{
            flex: 1,
            height,
            borderRadius: 1,
            background: i < lit ? color : 'var(--ln-hairline)',
            boxShadow: i < lit ? `0 0 6px ${color}80` : 'none',
            transition: 'background .12s, box-shadow .12s',
          }}
        />
      ))}
    </div>
  )
}
