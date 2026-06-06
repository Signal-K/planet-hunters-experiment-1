'use client'

import React from 'react'
import type { Player } from '@/game-context'

interface HUDStripProps {
  player: Player
}

export default function HUDStrip({ player }: HUDStripProps) {
  return (
    <div style={{
      position: 'absolute',
      top: 54,
      right: 14,
      zIndex: 20,
      display: 'flex',
      gap: 6,
      alignItems: 'center',
    }}>
      <div style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        padding: '4px 10px',
        background: 'rgba(8,16,28,0.78)',
        backdropFilter: 'blur(6px)',
        border: '1px solid rgba(63,169,255,0.35)',
        borderRadius: 999,
        fontFamily: 'var(--ln-font-display)',
        fontSize: 11, fontWeight: 700, letterSpacing: '0.14em',
        color: '#cde4ff', textTransform: 'uppercase',
      }}>
        <span style={{ color: '#7ec8ff' }}>LV</span>
        <span style={{ fontWeight: 800, fontSize: 14 }}>{player.level}</span>
      </div>
      <div style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        padding: '4px 10px',
        background: 'rgba(8,16,28,0.78)',
        backdropFilter: 'blur(6px)',
        border: '1px solid rgba(245,166,35,0.55)',
        borderRadius: 999,
        fontFamily: 'var(--ln-font-display)',
        fontSize: 11, fontWeight: 700, letterSpacing: '0.14em',
        color: '#f5a623', textTransform: 'uppercase',
      }}>
        <span style={{ color: '#d68a0d' }}>▲</span>
        <span style={{ fontWeight: 800, fontSize: 14 }}>{player.francs.toLocaleString()}</span>
      </div>
    </div>
  )
}
