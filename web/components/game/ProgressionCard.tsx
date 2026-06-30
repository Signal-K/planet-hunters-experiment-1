'use client'

import React from 'react'
import type { Player, Screen } from '@/game-context'
import { FREE_OPS_START_MISSIONS_DONE } from '@/lib/data/mission-generator'

interface ProgressionCardProps {
  player: Player
  onGoBuilding: (b: string) => void
  onNav: (s: Screen) => void
  top?: number
  onComingSoon?: (feature: string, description: string, target?: Date) => void
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
        <div style={{ fontFamily: 'var(--ln-font-display)', fontSize: 13, fontWeight: 800, color: '#e6efff', lineHeight: 1.3 }}>{title}</div>
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

export default function ProgressionCard({ player, onGoBuilding, onNav, top = 132, onComingSoon }: ProgressionCardProps) {
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
        onClick={() => onNav(player.missionPhase ?? 'transit')}
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

  const inOnboarding = player.missionsDone < FREE_OPS_START_MISSIONS_DONE

  if (!player.activeMission && player.missionsDone > 0) {
    if (!inOnboarding && (player.skillPoints ?? 0) > 0) {
      cards.push(
        <CardButton
          key="skills"
          testId="progression-card-skills"
          accent="var(--ln-cyan)"
          eyebrow="Skill Points"
          title={`${player.skillPoints ?? 0} SP available`}
          cta="Coming Soon"
          onClick={() => onComingSoon?.('Skill Tree', 'Train your crew and unlock upgraded drilling, cargo, and orbital capabilities.')}
        />
      )
    }
    const justFinishedOnboarding = player.missionsDone === FREE_OPS_START_MISSIONS_DONE
    cards.push(
      <CardButton
        key="next-mission"
        testId="progression-card-next-mission"
        accent="#39d36a"
        eyebrow={justFinishedOnboarding ? 'Onboarding Complete' : 'Next Mission'}
        title={justFinishedOnboarding ? 'Choose your first free contract' : 'New contract available'}
        cta="Browse Contracts"
        onClick={() => onNav('missions')}
      />
    )
  }

  if (cards.length === 0) return null

  return (
    <div style={{ position: 'absolute', right: 14, top, zIndex: 8, width: 'calc(100% - 28px)', maxWidth: 280, pointerEvents: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
      {cards}
    </div>
  )
}
