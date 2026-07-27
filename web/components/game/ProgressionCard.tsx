'use client'

import React from 'react'
import type { Player, Screen } from '@/game-context'
import { FREE_OPS_START_MISSIONS_DONE } from '@/lib/data/mission-generator'
import IconBadge from '@/components/ui/IconBadge'

type CardIconBadgeTone = 'cyan' | 'amber' | 'ok' | 'crit' | 'mute'

// The Earth Base palette is cyan + mint only (no amber on this screen), so
// the tile maps onto just two IconBadge tones. Exact color/border come from
// the inline style below — this only picks a sane base tone.
function toneForAccent(accent: string): CardIconBadgeTone {
  return accent.includes('mint') ? 'ok' : 'cyan'
}

// Small line-icon glyphs, one per progression-card eyebrow, in the same
// bordered white-line style as the mockup's side-panel + tab-row icons.
function ResumeGlyph() {
  return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M12 2L8 6H4l2 4-2 4h4l4 6 4-6h4l-2-4 2-4h-4L12 2z" /></svg>
}
function LaunchpadGlyph() {
  return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M4 21h16M6 21V9l6-5 6 5v12M10 21v-6h4v6" /></svg>
}
function SkillGlyph() {
  return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M12 2l2.5 7.5H22l-6 4.6 2.3 7.4L12 17l-6.3 4.5 2.3-7.4-6-4.6h7.5z" /></svg>
}
function SmsGlyph() {
  return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M4 15l8-8 8 8M8 11v9M16 11v9" /></svg>
}
function TelescopeGlyph() {
  return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>
}
function ContractGlyph() {
  return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="3" width="18" height="18" rx="2" /><line x1="8" y1="9" x2="16" y2="9" /><line x1="8" y1="13" x2="16" y2="13" /><line x1="8" y1="17" x2="12" y2="17" /></svg>
}

interface ProgressionCardProps {
  player: Player
  onGoBuilding: (b: string) => void
  onNav: (s: Screen) => void
  top?: number
}

function CardButton({ accent, icon, eyebrow, title, cta, onClick, testId }: {
  accent: string
  icon: React.ReactNode
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
        background: 'var(--hub-panel, #080d18)',
        border: '1.5px solid var(--hub-outline, rgba(255,255,255,0.55))',
        borderRadius: 12, padding: 10,
        boxShadow: '0 20px 44px rgba(0,0,0,0.5)',
        display: 'flex', alignItems: 'center', gap: 10,
      }}
    >
      {/* Bordered icon tile — the `.bp-panel` / `.picker-icon` chrome from the
          Earth Base mockup: black tile, accent-colored 1.5px outline. */}
      <IconBadge
        icon={icon}
        size={34}
        tone={toneForAccent(accent)}
        active
        style={{ color: accent, borderColor: accent, borderWidth: 1.5, background: 'rgba(0,10,24,0.6)', boxShadow: 'none' }}
      />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: 'var(--ln-font-display)', fontSize: 9, fontWeight: 700, letterSpacing: '0.14em', color: accent, textTransform: 'uppercase' }}>{eyebrow}</div>
        <div style={{ fontFamily: 'var(--ln-font-display)', fontSize: 13, fontWeight: 800, color: '#fff', lineHeight: 1.3 }}>{title}</div>
      </div>
      <span style={{
        flexShrink: 0,
        padding: '5px 10px', borderRadius: 999,
        background: 'transparent', border: `1.5px solid ${accent}`,
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
        accent="var(--hub-cyan)"
        icon={<ResumeGlyph />}
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
        accent="var(--hub-mint)"
        icon={<LaunchpadGlyph />}
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
          accent="var(--hub-cyan)"
          icon={<SkillGlyph />}
          eyebrow="Skill Points"
          title={`${player.skillPoints ?? 0} SP available`}
          cta="Open Skill Tree"
          onClick={() => onNav('skills')}
        />
      )
    }
    if (!inOnboarding && !player.satelliteMonitoringBuilt) {
      cards.push(
        <CardButton
          key="sms"
          testId="progression-card-sms"
          accent="var(--hub-cyan)"
          icon={<SmsGlyph />}
          eyebrow="New Facility"
          title="Build a Satellite Monitoring Station"
          cta="Build"
          onClick={() => onGoBuilding('build')}
        />
      )
    } else if (!inOnboarding && player.satelliteMonitoringBuilt && !player.transitSatelliteLaunchedAt) {
      cards.push(
        <CardButton
          key="telescope"
          testId="progression-card-transit-satellite"
          accent="var(--hub-cyan)"
          icon={<TelescopeGlyph />}
          eyebrow="Science Mission"
          title="Launch a transit telescope"
          cta="Open Mission"
          onClick={() => onNav('missions')}
        />
      )
    } else if (!inOnboarding && player.transitSatelliteLaunchedAt) {
      cards.push(
        <CardButton
          key="daily-candidates"
          testId="progression-card-tess-candidates"
          accent="var(--hub-cyan)"
          icon={<TelescopeGlyph />}
          eyebrow="Daily Downlink"
          title="Classify today's transit candidates"
          cta="Review"
          onClick={() => onNav('galaxy')}
        />
      )
    }
    const justFinishedOnboarding = player.missionsDone === FREE_OPS_START_MISSIONS_DONE
    cards.push(
      <CardButton
        key="next-mission"
        testId="progression-card-next-mission"
        accent="var(--hub-mint)"
        icon={<ContractGlyph />}
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
