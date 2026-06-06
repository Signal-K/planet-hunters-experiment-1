'use client'

import React from 'react'
import { MINERAL_META } from '@/lib/data'

interface MineralChipProps {
  mineral: string
  count?: number
}

export default function MineralChip({ mineral, count }: MineralChipProps) {
  const meta = MINERAL_META[mineral]
  if (!meta) return null
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
