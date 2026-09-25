'use client'

import React from 'react'
import type { Player, Screen } from '@/game-context'
import { FREE_OPS_START_MISSIONS_DONE } from '@/lib/data/mission-generator'
import { TUTORIAL_RAIL } from '@/lib/tutorial-layout'
import IconBadge from '@/components/ui/IconBadge'
import layoutStyles from '@/components/game/hub/HubLayout.module.css'
import { HUB_PROMPT_SKILLS, HUB_PROMPT_TRANSIT_TELESCOPE, isHubPromptDismissed, type HubPromptKey } from '@/lib/hub-prompts'

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
function TelescopeGlyph() {
  return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>
}

interface ProgressionCardProps {
  player: Player
  // Cards always open a routed scene. They must not call a Hub building
  // focus handler, even when the destination is the Launchpad.
  onOpenScene: (s: Screen) => void
  onDismissPrompt?: (key: HubPromptKey) => void
  top?: number
}

function CardButton({ accent, icon, eyebrow, title, cta, onClick, onDismiss, testId }: {
  accent: string
  icon: React.ReactNode
  eyebrow: string
  title: string
  cta: string
  onClick: () => void
  onDismiss?: () => void
  testId?: string
}) {
  return (
    <div
      style={{
        width: '100%', minWidth: 0, boxSizing: 'border-box',
        background: 'var(--hub-panel, #080d18)',
        border: '1.5px solid var(--hub-outline, rgba(255,255,255,0.55))',
        borderRadius: 12, padding: 8,
        boxShadow: '0 12px 28px rgba(0,0,0,0.4)',
        display: 'flex', alignItems: 'center', gap: 8,
      }}
    >
      <button
        data-testid={testId}
        onClick={onClick}
        style={{
          flex: 1, minWidth: 0, boxSizing: 'border-box', textAlign: 'left', cursor: 'pointer',
          background: 'transparent', border: 0, padding: 4,
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
        style={{ color: accent, borderColor: accent, borderWidth: 1.5, background: 'rgba(234,241,248,0.06)', boxShadow: 'none' }}
      />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: 'var(--ln-font-display)', fontSize: 9, fontWeight: 700, letterSpacing: '0.14em', color: accent, textTransform: 'uppercase' }}>{eyebrow}</div>
        <div style={{ fontFamily: 'var(--ln-font-display)', fontSize: 13, fontWeight: 800, color: 'rgba(234,241,248,0.94)', lineHeight: 1.3 }}>{title}</div>
      </div>
      <span style={{
        minWidth: 0, flexShrink: 1,
        padding: '5px 8px', borderRadius: 999,
        background: 'transparent', border: `1.5px solid ${accent}`,
        color: accent,
        fontFamily: 'var(--ln-font-display)', fontSize: 9, fontWeight: 800,
        letterSpacing: '0.12em', textTransform: 'uppercase',
        display: 'inline-flex', alignItems: 'center', gap: 4, whiteSpace: 'nowrap',
      }}>
        {cta} ›
      </span>
      </button>
      {onDismiss && (
        <button
          type="button"
          data-testid={testId ? `${testId}-dismiss` : undefined}
          aria-label="Dismiss"
          onClick={onDismiss}
          style={{
            flexShrink: 0, minWidth: 44, minHeight: 44, padding: '8px 8px',
            background: 'transparent', border: '1.5px solid var(--hub-outline, rgba(255,255,255,0.55))',
            borderRadius: 8, cursor: 'pointer',
            color: 'color-mix(in srgb, var(--ln-text) 78%, transparent)',
            fontFamily: 'var(--ln-font-display)', fontSize: 8, fontWeight: 800,
            letterSpacing: '0.12em', textTransform: 'uppercase',
          }}
        >
          Dismiss
        </button>
      )}
    </div>
  )
}

export default function ProgressionCard({ player, onOpenScene, onDismissPrompt, top = 132 }: ProgressionCardProps) {
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
        onClick={() => onOpenScene(player.missionPhase ?? 'transit')}
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
        onClick={() => onOpenScene('launchpad')}
      />
    )
  }

  const inOnboarding = player.missionsDone < FREE_OPS_START_MISSIONS_DONE

  if (!player.activeMission && player.missionsDone > 0) {
    if (!inOnboarding && (player.skillPoints ?? 0) > 0 && !isHubPromptDismissed(player, HUB_PROMPT_SKILLS)) {
      cards.push(
        <CardButton
          key="skills"
          testId="progression-card-skills"
          accent="var(--hub-cyan)"
          icon={<SkillGlyph />}
          eyebrow="Skill Points"
          title={`${player.skillPoints ?? 0} SP available`}
          cta="Open Skill Tree"
          onClick={() => onOpenScene('skills')}
          onDismiss={onDismissPrompt ? () => onDismissPrompt(HUB_PROMPT_SKILLS) : undefined}
        />
      )
    }
    if (!inOnboarding && !player.transitSatelliteLaunchedAt && !isHubPromptDismissed(player, HUB_PROMPT_TRANSIT_TELESCOPE)) {
      cards.push(
        <CardButton
          key="telescope"
          testId="progression-card-transit-satellite"
          accent="var(--hub-cyan)"
          icon={<TelescopeGlyph />}
          eyebrow="Your Program"
          title="Launch a transit telescope"
          cta="Open Launchpad"
          onClick={() => onOpenScene('launchpad')}
          onDismiss={onDismissPrompt ? () => onDismissPrompt(HUB_PROMPT_TRANSIT_TELESCOPE) : undefined}
        />
      )
    }
    // Free Ops reaches the mission board from the persistent Missions entry;
    // the Hub does not repeat a Browse Contracts card.
  }

  if (cards.length === 0) return null

  return (
    // `bottom` (not a fixed height) plus `overflowY: auto` — on short
    // viewports (e.g. mobile landscape, ~390px tall) up to three stacked
    // cards can exceed the space between `top` and the bottom tab bar. The
    // Hub root is `overflow: hidden`, so without an internal scroll
    // affordance here, cards below the fold were silently unreachable
    // rather than just visually tight (STS-612).
    <div className={`${layoutStyles.progressionStack} hub-progression-stack`} style={{
      position: 'absolute', top, bottom: TUTORIAL_RAIL.BOTTOM_PILL_Y, zIndex: 8,
      pointerEvents: 'auto',
      display: 'flex', flexDirection: 'column', gap: 6,
      overflowY: 'auto',
    }}>
      {cards}
    </div>
  )
}
