'use client'

import React from 'react'
import type { Player, Screen } from '@/game-context'

interface ProgressionCardProps {
  player: Player
  onGoBuilding: (b: string) => void
  onNav: (s: Screen) => void
  top?: number
}

function CardButton({ accent, eyebrow, title, cta, onClick, testId }: {
  accent: string
  eyebrow: string
  title: string
  cta: string
  onClick: () => void
  testId?: string
}) {
  return (
    <button
      data-testid={testId}
      onClick={onClick}
      style={{
        width: '100%', textAlign: 'left', cursor: 'pointer',
        background: 'linear-gradient(180deg, rgba(10,18,29,0.86), rgba(6,12,22,0.9))',
        border: `1px solid ${accent}66`,
        borderRadius: 12, padding: 10,
        backdropFilter: 'blur(8px)',
        boxShadow: `0 6px 18px rgba(0,0,0,0.4), 0 0 16px ${accent}22`,
        display: 'flex', alignItems: 'center', gap: 10,
      }}
    >
      <span style={{
        width: 6, height: 36, borderRadius: 3, flexShrink: 0,
        background: accent, boxShadow: `0 0 10px ${accent}`,
      }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: 'var(--ln-font-display)', fontSize: 8, fontWeight: 800, letterSpacing: '0.2em', color: accent, textTransform: 'uppercase' }}>{eyebrow}</div>
        <div style={{ fontFamily: 'var(--ln-font-display)', fontSize: 13, fontWeight: 800, color: '#e6efff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{title}</div>
      </div>
      <span style={{
        flexShrink: 0,
        padding: '5px 10px', borderRadius: 8,
        background: `${accent}22`, border: `1px solid ${accent}88`,
        color: accent,
        fontFamily: 'var(--ln-font-display)', fontSize: 9, fontWeight: 800,
        letterSpacing: '0.12em', textTransform: 'uppercase',
        display: 'inline-flex', alignItems: 'center', gap: 4,
      }}>
        {cta} ›
      </span>
    </button>
  )
}

export default function ProgressionCard({ player, onGoBuilding, onNav, top = 132 }: ProgressionCardProps) {
  const cards: React.ReactElement[] = []

  if (player.activeMission) {
    cards.push(
      <CardButton
        key="active"
        testId="progression-card-active"
        accent="#7ec8ff"
        eyebrow="Mission In Progress"
        title={player.activeMission.label}
        cta="Resume Mission"
        onClick={() => onNav('transit')}
      />
    )
  } else if (player.pendingLaunch) {
    cards.push(
      <CardButton
        key="pending"
        testId="progression-card-pending"
        accent="#f5a623"
        eyebrow="Launch Ready on Pad"
        title="Vessel fuelled & assigned"
        cta="Open Launchpad"
        onClick={() => onGoBuilding('launchpad')}
      />
    )
  }

  if (!player.activeMission && player.missionsDone > 0) {
    cards.push(
      <CardButton
        key="next-mission"
        testId="progression-card-next-mission"
        accent="#39d36a"
        eyebrow="Next Mission"
        title="New contract available"
        cta="View Missions"
        onClick={() => onNav('missions')}
      />
    )
  }

  // Star Map card — always visible; discovered count derived from missionsDone
  // (each completed mission unlocks a new target system).
  cards.push(
    <CardButton
      key="star-map"
      testId="progression-card-star-map"
      accent="#c87cff"
      eyebrow="Star Map"
      title={`Discovered: ${player.missionsDone} / ???`}
      cta="Explore"
      onClick={() => onNav('missions')}
    />
  )

  if (cards.length === 0) return null

  return (
    <div style={{ position: 'absolute', left: 14, right: 14, top, zIndex: 8, maxWidth: 300, pointerEvents: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
      {cards}
    </div>
  )
}
