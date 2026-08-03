'use client'

import React from 'react'

type IconBadgeTone = 'cyan' | 'amber' | 'ok' | 'crit' | 'mute'

interface IconBadgeProps {
  icon: React.ReactNode
  size?: number
  tone?: IconBadgeTone
  active?: boolean
  style?: React.CSSProperties
}

const TONES: Record<IconBadgeTone, string> = {
  cyan: 'var(--ln-cyan)',
  amber: 'var(--ln-amber)',
  ok: 'var(--ln-ok)',
  crit: 'var(--ln-crit)',
  mute: 'var(--ln-text-muted)',
}

// Out There: Omega icon language — a black-bordered square tile with a
// clean white-line glyph, not a painted/filled icon. Applied uniformly to
// every resource/cargo/part glyph across the re-skinned screens.
export default function IconBadge({ icon, size = 34, tone = 'cyan', active = false, style }: IconBadgeProps) {
  const color = TONES[tone]
  return (
    <div
      style={{
        width: size,
        height: size,
        flexShrink: 0,
        display: 'grid',
        placeItems: 'center',
        borderRadius: 6,
        background: 'rgba(10,10,12,0.6)',
        border: `1.5px solid ${active ? color : 'var(--ln-hairline-strong)'}`,
        color: active ? color : 'var(--ln-text-dim)',
        boxShadow: active ? `0 0 0 1px ${color}40, 0 0 14px ${color}30` : 'none',
        transition: 'border-color .15s, color .15s, box-shadow .15s',
        ...style,
      }}
    >
      {icon}
    </div>
  )
}
