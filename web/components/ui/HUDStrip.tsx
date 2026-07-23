'use client'

import React from 'react'
import type { Player } from '@/game-context'
import { MINERAL_META } from '@/lib/data'
import { formatFrancs } from '@/lib/format'
import IconBadge from '@/components/ui/IconBadge'

interface HUDStripProps {
  player: Player
  /** Shows the mineral-stash chip row below the francs/jobs pills when the player has cargo. Off by default since not every HUD placement wants it. */
  showStash?: boolean
}

function FrancGlyph() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><circle cx="12" cy="12" r="9" /><path d="M9 8h5M9 12h4M10 8v9" /></svg>
  )
}
function JobsGlyph() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><rect x="4" y="4" width="16" height="16" rx="1.5" /><path d="M4 10h16M10 4v16" /></svg>
  )
}
function MineralGlyph({ shape, color }: { shape?: string; color: string }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.7">
      {shape === 'circle' && <circle cx="12" cy="12" r="8" />}
      {shape === 'diamond' && <path d="M12 3l9 9-9 9-9-9z" />}
      {shape === 'triangle' && <path d="M12 4l8 16H4z" />}
      {shape === 'rect' && <rect x="4" y="6" width="16" height="12" rx="1.5" />}
    </svg>
  )
}

// Ref-B bordered-icon-badge resource readout (francs / jobs / mineral stash).
// Renders as an inline flex column — callers position it within their own header layout.
export default function HUDStrip({ player, showStash = false }: HUDStripProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-end' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 9px 5px 6px', background: 'rgba(8,12,22,0.7)', backdropFilter: 'blur(6px)', border: '1px solid rgba(245,166,35,0.5)', borderRadius: 8 }}>
        <IconBadge icon={<FrancGlyph />} size={20} tone="amber" active />
        <span style={{ fontFamily: 'var(--ln-font-display)', fontSize: 12, fontWeight: 800, letterSpacing: '0.04em', color: '#f5a623' }}>
          {formatFrancs(player.francs)}
        </span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 8px 4px 5px', background: 'rgba(8,12,22,0.7)', backdropFilter: 'blur(6px)', border: '1px solid rgba(255,179,71,0.4)', borderRadius: 7 }}>
        <IconBadge icon={<JobsGlyph />} size={18} tone="amber" active />
        <span style={{ fontFamily: 'var(--ln-font-display)', fontSize: 9, fontWeight: 800, letterSpacing: '0.16em', color: '#ffb347', textTransform: 'uppercase' }}>
          {player.missionCount} Jobs
        </span>
      </div>
      {showStash && player.stash && Object.keys(player.stash).length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'flex-end', gap: 5, maxWidth: 220 }}>
          {Object.entries(player.stash).map(([kind, qty]) => {
            const meta = MINERAL_META[kind]
            if (!meta || !qty) return null
            return (
              <div key={kind} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '3px 8px 3px 4px', background: 'rgba(8,12,22,0.7)', backdropFilter: 'blur(6px)', border: `1px solid ${meta.color}66`, borderRadius: 7 }}>
                <IconBadge icon={<MineralGlyph shape={meta.shape} color={meta.color} />} size={16} tone="ok" style={{ borderColor: `${meta.color}88`, color: meta.color }} />
                <span style={{ fontFamily: 'var(--ln-font-display)', fontSize: 9, fontWeight: 800, letterSpacing: '0.1em', color: meta.color, textTransform: 'uppercase' }}>
                  {qty}
                </span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
