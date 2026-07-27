'use client'

import React from 'react'
import type { Player } from '@/game-context'
import { MINERAL_META } from '@/lib/data'
import { formatFrancs } from '@/lib/format'

interface HUDStripProps {
  player: Player
  /** Shows the mineral-stash chip row below the francs/jobs chips when the player has cargo. Off by default since not every HUD placement wants it. */
  showStash?: boolean
}

function FrancGlyph() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><circle cx="12" cy="12" r="9" /><path d="M9 8h5M9 12h4M10 8v9" /></svg>
  )
}
function JobsGlyph() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><rect x="4" y="4" width="16" height="16" rx="1.5" /><path d="M4 10h16M10 4v16" /></svg>
  )
}
function MineralGlyph({ shape, color }: { shape?: string; color: string }) {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.7">
      {shape === 'circle' && <circle cx="12" cy="12" r="8" />}
      {shape === 'diamond' && <path d="M12 3l9 9-9 9-9-9z" />}
      {shape === 'triangle' && <path d="M12 4l8 16H4z" />}
      {shape === 'rect' && <rect x="4" y="6" width="16" height="12" rx="1.5" />}
    </svg>
  )
}

/**
 * Resource readout — reworked 2026-07-26 to the `landnam-earth-base-v2.html`
 * chip: black tile, 1.5px white outline, bordered icon tile in the accent,
 * white Turret Road numerals.
 *
 * The old amber-on-amber francs pill is gone deliberately. Amber is reserved
 * for genuine payout emphasis, and the Earth Base mockup carries no amber at
 * all — the chrome reads cyan/mint against the blue sky instead.
 */
function Chip({ glyph, children, accent = 'var(--hub-cyan)' }: { glyph: React.ReactNode; children: React.ReactNode; accent?: string }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 7,
      background: 'rgba(0,10,24,0.72)',
      border: '1.5px solid var(--hub-outline)',
      borderRadius: 7, padding: '6px 10px 6px 6px',
    }}>
      <span style={{
        width: 20, height: 20, borderRadius: 5, display: 'grid', placeItems: 'center',
        background: 'rgba(0,10,24,0.6)', border: `1.5px solid ${accent}`, color: accent,
      }}>
        {glyph}
      </span>
      {children}
    </div>
  )
}

export default function HUDStrip({ player, showStash = false }: HUDStripProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-end' }}>
      <Chip glyph={<FrancGlyph />}>
        <span style={{ fontFamily: 'var(--ln-font-mono)', fontWeight: 700, fontSize: 12, color: '#fff' }}>
          {formatFrancs(player.francs)}
        </span>
      </Chip>
      <Chip glyph={<JobsGlyph />}>
        <span style={{ fontFamily: 'var(--ln-font-display)', fontWeight: 800, fontSize: 9, letterSpacing: '0.14em', color: '#fff', textTransform: 'uppercase' }}>
          {player.missionCount} Jobs
        </span>
      </Chip>
      {showStash && player.stash && Object.keys(player.stash).length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'flex-end', gap: 5, maxWidth: 220 }}>
          {Object.entries(player.stash).map(([kind, qty]) => {
            const meta = MINERAL_META[kind]
            if (!meta || !qty) return null
            return (
              <div key={kind} style={{
                display: 'flex', alignItems: 'center', gap: 5,
                padding: '3px 8px 3px 4px',
                background: 'rgba(0,10,24,0.72)',
                border: '1.5px solid rgba(255,255,255,0.35)',
                borderRadius: 7,
              }}>
                <span style={{
                  width: 16, height: 16, borderRadius: 4, display: 'grid', placeItems: 'center',
                  background: 'rgba(0,10,24,0.6)', border: `1.5px solid ${meta.color}`, color: meta.color,
                }}>
                  <MineralGlyph shape={meta.shape} color={meta.color} />
                </span>
                <span style={{ fontFamily: 'var(--ln-font-mono)', fontWeight: 700, fontSize: 10, color: '#fff' }}>
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
