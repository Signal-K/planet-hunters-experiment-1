'use client'

import React from 'react'

interface PipeSegmentProps {
  /** SVG path `d` for the pipe run, e.g. "M24 40 H150 V110 H236". */
  d: string
  state?: 'flowing' | 'idle' | 'severed'
  strokeWidth?: number
}

const STROKE: Record<NonNullable<PipeSegmentProps['state']>, string> = {
  flowing: 'var(--ln-cyan)',
  idle: 'var(--ln-ok)',
  severed: 'var(--ln-crit)',
}

/** Construction Kit "pipe segment" primitive (KES-280) — one drawable run for the top-down pipeline console/routing view. Render several inside a shared `<svg>`. */
export default function PipeSegment({ d, state = 'flowing', strokeWidth = 3 }: PipeSegmentProps) {
  return (
    <path
      d={d}
      stroke={STROKE[state]}
      strokeWidth={strokeWidth}
      fill="none"
      strokeLinecap="square"
      strokeDasharray={state === 'severed' ? '7 5' : undefined}
      className={state === 'flowing' ? 'ln-con-flow' : undefined}
    />
  )
}
