'use client'

import React from 'react'
import type { Player, Screen } from '@/game-context'

interface ProgressionCardProps {
  player: Player
  onGoBuilding: (b: string) => void
  onNav: (s: Screen) => void
}

export default function ProgressionCard({ player, onGoBuilding, onNav }: ProgressionCardProps) {
  let card: {
    accent: string
    eyebrow: string
    title: string
    cta: string
    go: () => void
  }

  if (player.activeMission) {
    card = {
      accent: '#7ec8ff',
      eyebrow: 'Mission In Progress',
      title: player.activeMission.label,
      cta: 'Resume Mission',
      go: () => onNav('transit'),
    }
  } else if (player.pendingLaunch) {
    card = {
      accent: '#f5a623',
      eyebrow: 'Launch Ready on Pad',
      title: 'Vessel fuelled & assigned',
      cta: 'Open Launchpad',
      go: () => onGoBuilding('launchpad'),
    }
  } else {
    card = {
      accent: '#f5a623',
      eyebrow: 'Next Mission Available',
      title: `${player.missionCount} contracts on the board`,
      cta: 'Open Missions',
      go: () => onNav('missions'),
    }
  }

  return (
    <div style={{ position: 'absolute', left: 14, right: 14, top: 132, zIndex: 8, maxWidth: 300, pointerEvents: 'auto' }}>
      <button
        onClick={card.go}
        style={{
          width: '100%', textAlign: 'left', cursor: 'pointer',
          background: 'linear-gradient(180deg, rgba(10,18,29,0.86), rgba(6,12,22,0.9))',
          border: `1px solid ${card.accent}66`,
          borderRadius: 12, padding: 10,
          backdropFilter: 'blur(8px)',
          boxShadow: `0 6px 18px rgba(0,0,0,0.4), 0 0 16px ${card.accent}22`,
          display: 'flex', alignItems: 'center', gap: 10,
        }}
      >
        <span style={{
          width: 6, height: 36, borderRadius: 3, flexShrink: 0,
          background: card.accent, boxShadow: `0 0 10px ${card.accent}`,
        }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: 'var(--ln-font-display)', fontSize: 8, fontWeight: 800, letterSpacing: '0.2em', color: card.accent, textTransform: 'uppercase' }}>{card.eyebrow}</div>
          <div style={{ fontFamily: 'var(--ln-font-display)', fontSize: 13, fontWeight: 800, color: '#e6efff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{card.title}</div>
        </div>
        <span style={{
          flexShrink: 0,
          padding: '5px 10px', borderRadius: 8,
          background: `${card.accent}22`, border: `1px solid ${card.accent}88`,
          color: card.accent,
          fontFamily: 'var(--ln-font-display)', fontSize: 9, fontWeight: 800,
          letterSpacing: '0.12em', textTransform: 'uppercase',
          display: 'inline-flex', alignItems: 'center', gap: 4,
        }}>
          {card.cta} ›
        </span>
      </button>
    </div>
  )
}
