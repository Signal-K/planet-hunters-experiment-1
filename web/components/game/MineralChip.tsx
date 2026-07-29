'use client'

import React from 'react'
import { MINERAL_META } from '@/lib/data'

interface ChipMeta {
  name: string
  sym: string
  color: string
}

interface MineralChipProps {
  /** Mineral catalog id — looked up in MINERAL_META. Ignored if `meta` is given. */
  mineral?: string
  /** Resolved swatch data for entities outside MINERAL_META (e.g. refinery outputs). Takes precedence over `mineral`. */
  meta?: ChipMeta
  count?: number
  /** 'chip' = pill with symbol + count + name (default). 'avatar' = square icon-only swatch, for list-row leading icons. */
  variant?: 'chip' | 'avatar'
  /** Avatar edge length in px. Ignored in 'chip' variant. */
  size?: number
}

export default function MineralChip({ mineral, meta: metaProp, count, variant = 'chip', size = 36 }: MineralChipProps) {
  const meta = metaProp ?? (mineral ? MINERAL_META[mineral] : undefined)
  if (!meta) return null

  if (variant === 'avatar') {
    return (
      <div style={{
        width: size, height: size, borderRadius: 8,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: Math.round(size * 0.44), fontWeight: 800,
        fontFamily: 'var(--ln-font-mono)',
        background: `${meta.color}22`,
        border: `1px solid ${meta.color}`,
        color: meta.color,
        flex: 'none',
      }}>
        {meta.sym}
      </div>
    )
  }

  return (
    <div style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 5,
      padding: count !== undefined ? '3px 8px 3px 6px' : '3px 8px',
      background: `${meta.color}18`,
      border: `1px solid ${meta.color}55`,
      borderRadius: 6,
    }}>
      <span style={{
        fontFamily: 'var(--ln-font-mono)',
        fontSize: 10,
        fontWeight: 800,
        color: meta.color,
        letterSpacing: '0.04em',
      }}>
        {meta.sym}
      </span>
      {count !== undefined && (
        <span style={{
          fontFamily: 'var(--ln-font-display)',
          fontSize: 11,
          fontWeight: 800,
          color: meta.color,
        }}>
          ×{count}
        </span>
      )}
      <span style={{
        fontFamily: 'var(--ln-font-display)',
        fontSize: 10,
        color: meta.color,
        opacity: 0.8,
      }}>
        {meta.name}
      </span>
    </div>
  )
}
