'use client'

import React from 'react'
import { MINERAL_META } from '@/lib/data'
import { ORIONIDS_VARIANTS } from '@/lib/orionids/theme'

const ORIONID_ICON = ORIONIDS_VARIANTS.blueprint.iconResource

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
    if (mineral === 'orionid_debris') {
      return (
        <img
          src={ORIONID_ICON}
          alt=""
          width={size}
          height={size}
          style={{ width: size, height: size, flex: 'none', objectFit: 'contain' }}
        />
      )
    }
    return (
      <div style={{
        width: size, height: size, borderRadius: 8,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: Math.max(14, Math.round(size * 0.44)), fontWeight: 800,
        fontFamily: 'var(--ln-font-mono)',
        background: `${meta.color}33`,
        border: `2px solid ${meta.color}`,
        color: 'var(--ln-text)',
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
        fontSize: 14,
        fontWeight: 800,
        color: 'var(--ln-text)',
        letterSpacing: '0.04em',
      }}>
        {meta.sym}
      </span>
      {count !== undefined && (
        <span style={{
          fontFamily: 'var(--ln-font-display)',
          fontSize: 14,
          fontWeight: 800,
          color: 'var(--ln-text)',
        }}>
          ×{count}
        </span>
      )}
      <span style={{
        fontFamily: 'var(--ln-font-display)',
        fontSize: 14,
        color: 'var(--ln-text)',
      }}>
        {meta.name}
      </span>
    </div>
  )
}
