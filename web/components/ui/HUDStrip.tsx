'use client'

import React from 'react'
import type { Player } from '@/game-context'
import { MINERAL_META } from '@/lib/data'
import { formatCurrency } from '@/lib/format'

interface HUDStripProps {
  player: Player
  /** Shows the mineral-stash chip row below the francs/jobs chips when the player has cargo. Off by default since not every HUD placement wants it. */
  showStash?: boolean
  /** Second direct entry to the Mission Board, alongside the launchpad. Omit to keep the Jobs chip a plain readout. */
  onJobsClick?: () => void
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
 * Resource readout — a persistent left-edge stacked rail (KES-219/220),
 * recolored dark 2026-08-21 (KES-226) when the light "blueprint" attempt
 * was scrapped. Each stat is its own compact card, chalky-green-bordered on
 * the interactive (clickable) card — the tapnine.com "Black Hole"
 * reference's fixed vertical stat stack, its original hot-pink highlight
 * swapped for a chalkier accent (2026-08-23).
 */
function RailCard({ glyph, children, accent = 'var(--hub-cyan)', onClick, testId }: { glyph: React.ReactNode; children: React.ReactNode; accent?: string; onClick?: () => void; testId?: string }) {
  const Tag = onClick ? 'button' : 'div'
  return (
    <Tag
      data-testid={testId}
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 8, width: '100%', boxSizing: 'border-box',
        background: 'var(--hub-panel)',
        border: `1.5px solid ${onClick ? 'var(--hub-chalk)' : 'var(--hub-outline)'}`,
        borderRadius: 9, padding: '7px 10px 7px 7px',
        cursor: onClick ? 'pointer' : undefined,
        textAlign: 'left',
        boxShadow: '0 2px 8px rgba(0,0,0,0.35)',
      }}
    >
      <span style={{
        width: 22, height: 22, borderRadius: 6, display: 'grid', placeItems: 'center', flexShrink: 0,
        background: 'var(--hub-panel-deep)', border: `1.5px solid ${accent}`, color: accent,
      }}>
        {glyph}
      </span>
      {children}
    </Tag>
  )
}

export default function HUDStrip({ player, showStash = false, onJobsClick }: HUDStripProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-start', width: 132 }}>
      <RailCard glyph={<FrancGlyph />}>
        <span style={{ fontFamily: 'var(--ln-font-mono)', fontWeight: 700, fontSize: 12, color: '#eaf1f8' }}>
          {formatCurrency(player.francs, { compact: true })}
        </span>
      </RailCard>
      <RailCard glyph={<JobsGlyph />} onClick={onJobsClick} testId="hud-jobs-chip">
        <span style={{ fontFamily: 'var(--ln-font-display)', fontWeight: 800, fontSize: 9, letterSpacing: '0.14em', color: '#eaf1f8', textTransform: 'uppercase' }}>
          {player.missionCount} Jobs
        </span>
      </RailCard>
      {showStash && player.stash && Object.keys(player.stash).length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5, width: '100%' }}>
          {Object.entries(player.stash).map(([kind, qty]) => {
            const meta = MINERAL_META[kind]
            if (!meta || !qty) return null
            return (
              <div key={kind} style={{
                display: 'flex', alignItems: 'center', gap: 6, width: '100%', boxSizing: 'border-box',
                padding: '4px 8px 4px 5px',
                background: 'var(--hub-panel)',
                border: '1.5px solid var(--hub-outline)',
                borderRadius: 8,
              }}>
                <span style={{
                  width: 17, height: 17, borderRadius: 5, display: 'grid', placeItems: 'center', flexShrink: 0,
                  background: 'var(--hub-panel-deep)', border: `1.5px solid ${meta.color}`, color: meta.color,
                }}>
                  <MineralGlyph shape={meta.shape} color={meta.color} />
                </span>
                <span style={{ fontFamily: 'var(--ln-font-mono)', fontWeight: 700, fontSize: 10, color: '#eaf1f8' }}>
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
