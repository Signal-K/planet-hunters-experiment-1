'use client'

import React from 'react'

export type TerrainKind = 'viable' | 'ore' | 'water' | 'rock' | 'built'

interface TerrainGridProps {
  cols: number
  tiles: TerrainKind[]
  selected?: number
  onSelect?: (i: number) => void
}

const FILL: Record<TerrainKind, string> = {
  viable: 'var(--ln-ok-soft)',
  ore: 'var(--ln-amber-soft)',
  water: 'var(--ln-cyan-soft)',
  rock: 'var(--ln-panel-2)',
  built: 'var(--ln-crit-soft)',
}
const MARK: Record<TerrainKind, string> = { viable: '', ore: '◆', water: '≈', rock: '▨', built: '▣' }

/**
 * Construction Kit "terrain tiles" primitive (KES-280) — flat top-down build-site grid.
 * The source kit shows this as an isometric view for placement vs. a flat top-down view
 * for routing; kept flat here (matching the rest of Landnam's flat game rendering) rather
 * than adding a second, iso-only tile renderer for one scene.
 */
export default function TerrainGrid({ cols, tiles, selected, onSelect }: TerrainGridProps) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 3 }}>
      {tiles.map((t, i) => {
        const isSel = i === selected
        return (
          <button
            key={i}
            onClick={() => onSelect?.(i)}
            style={{
              height: 52,
              border: isSel ? '1.5px solid var(--ln-cyan)' : '1px solid var(--ln-hairline)',
              borderRadius: 3,
              background: FILL[t],
              cursor: onSelect ? 'pointer' : 'default',
              boxShadow: isSel ? 'var(--ln-glow-cyan)' : undefined,
              font: '700 13px var(--ln-font-mono)',
              color: 'var(--ln-text-dim)',
              display: 'grid',
              placeItems: 'center',
              padding: 0,
            }}
          >
            {MARK[t]}
          </button>
        )
      })}
    </div>
  )
}
