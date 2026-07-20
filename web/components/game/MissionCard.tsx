'use client'

import React, { useState } from 'react'
import type { Mission, Contractor, MineralMeta } from '@/lib/data'
import TutorialHighlight from '@/components/game/TutorialHighlight'
import ContractorMark from '@/components/ui/ContractorMark'

type CardState = 'available' | 'locked' | 'cooldown' | 'completed'

interface MissionCardProps {
  mission: Mission
  contractor?: Contractor | null
  mineralMeta: Record<string, MineralMeta>
  targetCount: number
  displayPayout: number
  affinityMultiplier: number
  affinityReward: number
  unlocked: boolean
  isStoryMission: boolean
  cardState: CardState
  lockedDetail?: string
  cooldownLabel?: string
  highlighted?: boolean
  // Set for two-leg "mine then deliver" missions, e.g. "Vesta → Ceres".
  routeLabel?: string
  onPick: () => void
}

const STATE_TONE: Record<Exclude<CardState, 'available'>, { label: string; color: string }> = {
  locked: { label: 'LOCKED', color: 'var(--ln-text-muted)' },
  cooldown: { label: 'COOLDOWN', color: 'var(--ln-amber)' },
  completed: { label: 'COMPLETED TODAY', color: 'var(--ln-ok)' },
}

const ROLE_LABELS: Record<Contractor['uiRole'], string> = {
  starter: 'Starter operations',
  bulk: 'Bulk freight',
  prospect: 'Prospecting',
  command: 'Strategic command',
  science: 'Research',
}

// Always-visible cargo/premium/affinity chip row — ported from the Open
// Design "Client Bonus" mockup's contract-card chips (see
// web/components/game/previews/missionFlowPreviewData.ts for the source
// pattern), restyled onto real --ln-* dark tokens and driven by real
// mission/contractor data instead of the preview's fixed sample jobs.
function MetricChips({
  mission,
  contractor,
  mineralMeta,
  accent,
}: {
  mission: Mission
  contractor?: Contractor | null
  mineralMeta: Record<string, MineralMeta>
  accent: string
}) {
  const mineralEntries = Object.entries(mission.requires.minerals)
  const cargoValue = mineralEntries.length === 0
    ? 'Any'
    : mineralEntries.map(([k, v]) => `${v} ${mineralMeta[k]?.sym ?? k}`).join(' / ')
  const chips: { label: string; value: string; empty?: boolean }[] = [
    { label: 'Cargo', value: cargoValue },
    contractor
      ? { label: 'Premium', value: `+${Math.round(contractor.payoutPremium * 100)}%` }
      : { label: 'Premium', value: 'None', empty: true },
    contractor
      ? { label: 'Affinity', value: `+${Math.round(contractor.affinityBonusPerMission * 1000) / 10}%` }
      : { label: 'Affinity', value: 'None', empty: true },
  ]
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 6, padding: '8px 14px 0' }}>
      {chips.map(chip => (
        <div
          key={chip.label}
          style={{
            minWidth: 0, padding: 6, borderRadius: 4,
            border: `1px solid ${chip.empty ? 'var(--ln-hairline)' : `${accent}45`}`,
            background: 'var(--ln-void)',
          }}
        >
          <div style={{ font: '700 8px var(--ln-font-mono)', color: 'var(--ln-text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            {chip.label}
          </div>
          <div style={{
            font: '800 12px var(--ln-font-display)', marginTop: 2,
            color: chip.empty ? 'var(--ln-text-muted)' : accent,
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}>
            {chip.value}
          </div>
        </div>
      ))}
    </div>
  )
}

export default function MissionCard({
  mission,
  contractor,
  mineralMeta,
  targetCount,
  displayPayout,
  affinityMultiplier,
  affinityReward,
  unlocked,
  isStoryMission,
  cardState,
  lockedDetail,
  cooldownLabel,
  highlighted,
  routeLabel,
  onPick,
}: MissionCardProps) {
  const [expanded, setExpanded] = useState(false)
  const accent = contractor?.color ?? 'var(--ln-amber)'
  const difficultyTier = mission.difficulty.startsWith('L') ? parseInt(mission.difficulty.slice(1), 10) : NaN
  const difficultyColor = difficultyTier <= 1 ? 'var(--ln-ok)' : difficultyTier === 2 ? 'var(--ln-amber)' : 'var(--ln-crimson)'
  const isAvailable = cardState === 'available'
  const stateTone = !isAvailable ? STATE_TONE[cardState] : null
  const statusCta = cardState === 'cooldown' ? (cooldownLabel ?? 'On cooldown')
    : cardState === 'completed' ? 'Claimed'
    : cardState === 'locked' ? (lockedDetail ?? 'Locked')
    : ''
  const fuelTimerLabel = routeLabel ? 'Two-leg burn' : mission.deliveryTargetId ? 'Delivery burn' : difficultyTier >= 3 ? 'Long burn' : 'Standard burn'

  return (
    <div
      role="button"
      tabIndex={unlocked ? 0 : -1}
      aria-disabled={!unlocked}
      data-mission-id={mission.id}
      data-testid={`mission-card-${mission.id}`}
      onClick={() => unlocked && onPick()}
      onKeyDown={e => {
        if (!unlocked) return
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onPick()
        }
      }}
      className="mission-card-btn"
      style={{
        background: 'transparent', border: 'none', padding: 0, textAlign: 'left', width: '100%',
        cursor: unlocked ? 'pointer' : 'not-allowed',
        opacity: cardState === 'completed' ? 0.45 : unlocked ? 1 : 0.5,
        outline: '2px solid transparent', outlineOffset: 2, position: 'relative',
      }}
    >
      {highlighted && <TutorialHighlight />}
      <div style={{
        background: 'var(--ln-void)', border: `1px solid ${accent}45`, display: 'flex',
        boxShadow: '0 12px 32px -16px rgba(0,0,0,0.55)', fontFamily: 'var(--ln-font-display)',
      }}>
        {/* LEFT RAIL: contractor identity + status/difficulty */}
        <div style={{
          width: 76, flex: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
          padding: '14px 8px', borderRight: `1px solid ${accent}30`, background: 'var(--ln-surface)',
        }}>
          <ContractorMark
            initial={contractor?.initial ?? 'OP'}
            color={accent}
            uiRole={contractor?.uiRole ?? 'starter'}
            contractorId={contractor?.id}
          />
          <div style={{ textAlign: 'center', font: '700 10px var(--ln-font-display)', color: 'var(--ln-text)', textTransform: 'uppercase', letterSpacing: '0.02em', lineHeight: 1.15 }}>
            {contractor?.name ?? 'Free Ops'}
          </div>
          <div style={{ font: '600 8px var(--ln-font-mono)', color: 'var(--ln-text-muted)', letterSpacing: '0.09em', textTransform: 'uppercase' }}>
            {mission.tag}
          </div>

          <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
            <div style={{ font: '700 8px var(--ln-font-mono)', color: difficultyColor, letterSpacing: '0.08em', border: `1px solid ${difficultyColor}`, padding: '3px 6px', borderRadius: 2 }}>
              {mission.difficulty}
            </div>
            {isAvailable && (
              <div style={{ width: 6, height: 6, borderRadius: 999, background: 'var(--ln-ok)', boxShadow: '0 0 6px var(--ln-ok)' }} className="mission-card-pulse" />
            )}
          </div>
        </div>

        {/* MAIN COLUMN */}
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '10px 14px 0', font: '600 9px var(--ln-font-mono)', color: 'var(--ln-text-muted)', letterSpacing: '0.07em', textTransform: 'uppercase', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {isStoryMission
              ? 'Story mission · Not a client request'
              : contractor
                ? `Wants ${contractor.mineralPreferences.join(' / ')} · +${Math.round(contractor.payoutPremium * 100)}%`
                : 'Choose target · keep the haul · market-led mining'}
          </div>

          {/* Title + always-visible state chip — ported from the OD mockup's
              contract-top row (kicker/title on the left, state badge on the
              right), restyled onto dark tokens. */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, padding: '4px 14px 0' }}>
            <div style={{ font: '700 12px var(--ln-font-display)', color: 'var(--ln-text)', textTransform: 'uppercase', letterSpacing: '0.01em' }}>
              {mission.title}
            </div>
            <span style={{
              flex: 'none', font: '700 8px var(--ln-font-mono)', letterSpacing: '0.08em', textTransform: 'uppercase',
              padding: '3px 6px', borderRadius: 3,
              color: stateTone?.color ?? 'var(--ln-ok)',
              border: `1px solid ${stateTone?.color ?? 'var(--ln-ok)'}`,
              background: `${stateTone?.color ?? 'var(--ln-ok)'}12`,
            }}>
              {cardState === 'cooldown' && cooldownLabel ? cooldownLabel : stateTone?.label ?? 'READY'}
            </span>
          </div>

          {routeLabel && (
            <div style={{ padding: '2px 14px 0', font: '700 9px var(--ln-font-mono)', color: 'var(--ln-cyan)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              {routeLabel}
            </div>
          )}

          <MetricChips mission={mission} contractor={contractor} mineralMeta={mineralMeta} accent={accent} />

          <div style={{ display: 'flex', gap: 6, padding: '8px 14px 0', flexWrap: 'wrap' }}>
            <span style={{ font: '700 8px var(--ln-font-mono)', color: 'var(--ln-amber)', letterSpacing: '0.08em', textTransform: 'uppercase', border: '1px solid rgba(245,166,35,0.35)', background: 'rgba(245,166,35,0.08)', padding: '3px 6px', borderRadius: 3 }}>
              Fuel timer · {fuelTimerLabel}
            </span>
            {contractor && (
              <span style={{ font: '700 8px var(--ln-font-mono)', color: accent, letterSpacing: '0.08em', textTransform: 'uppercase', border: `1px solid ${accent}55`, background: `${accent}12`, padding: '3px 6px', borderRadius: 3 }}>
                {ROLE_LABELS[contractor.uiRole]}
              </span>
            )}
          </div>

          <div style={{ margin: '10px 14px 8px', padding: 12, background: 'var(--ln-surface)', borderLeft: '2px solid var(--ln-cyan)' }}>
            <div style={{ font: '400 15px/1.5 var(--ln-font-display)', color: 'var(--ln-text)' }}>{mission.brief}</div>
          </div>

          <div
            role="button"
            tabIndex={0}
            onClick={e => { e.stopPropagation(); setExpanded(v => !v) }}
            onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.stopPropagation(); setExpanded(v => !v) } }}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '2px 14px 10px', cursor: 'pointer', font: '700 9px var(--ln-font-mono)', color: 'var(--ln-cyan)', letterSpacing: '0.09em', textTransform: 'uppercase' }}
          >
            <span>{expanded ? 'HIDE CLIENT INFO' : 'CLIENT INFO'}</span>
            <span style={{ transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 120ms ease-out', display: 'inline-block' }}>▾</span>
          </div>

          {expanded && (
            <div style={{ margin: '0 14px 12px', padding: 12, border: `1px solid ${accent}30`, background: 'var(--ln-void)', display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <ContractorMark
                  initial={contractor?.initial ?? 'OP'}
                  color={accent}
                  uiRole={contractor?.uiRole ?? 'starter'}
                  contractorId={contractor?.id}
                  size={44}
                />
                <div style={{ minWidth: 0 }}>
                  <div style={{ font: '700 9px var(--ln-font-mono)', color: accent, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
                    {contractor ? ROLE_LABELS[contractor.uiRole] : 'Independent operator'}
                  </div>
                  <div style={{ font: '700 13px var(--ln-font-display)', color: 'var(--ln-text)', marginTop: 2 }}>
                    {contractor?.name ?? 'Free Ops'}
                  </div>
                </div>
              </div>
              <div style={{ font: '400 11px/1.5 var(--ln-font-display)', color: 'var(--ln-text-dim)' }}>{contractor?.projectType ?? 'Custom mining run · market value only'}</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 6 }}>
                <DossierStat label="Premium" value={contractor ? `+${Math.round(contractor.payoutPremium * 100)}%` : 'Market'} color={accent} />
                <DossierStat label="Affinity" value={contractor ? `+${Math.round(contractor.affinityBonusPerMission * 1000) / 10}%` : 'None'} color={accent} />
                <DossierStat label="Timer" value={fuelTimerLabel} color="var(--ln-amber)" />
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {Object.entries(mission.requires.minerals).map(([k, v]) => {
                  const meta = mineralMeta[k]
                  if (!meta) return null
                  return (
                    <span key={k} style={{ font: '600 9px var(--ln-font-mono)', color: meta.color, letterSpacing: '0.06em', background: `${meta.color}1a`, border: `1px solid ${meta.color}`, padding: '2px 6px', borderRadius: 2 }}>
                      {meta.sym} ×{v}
                    </span>
                  )
                })}
              </div>
              {contractor && (
                <div style={{ font: '600 9px var(--ln-font-mono)', color: 'var(--ln-text-muted)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                  Premium is a flat payout bonus for every {contractor.name} job. Affinity stacks +{Math.round(contractor.affinityBonusPerMission * 1000) / 10}% per completed {contractor.name} job, capped at +15% total.
                </div>
              )}
            </div>
          )}

          <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: '10px 14px', borderTop: `1px solid ${accent}30`, background: 'var(--ln-surface-2)' }}>
            <div>
              <div style={{ font: '700 18px var(--ln-font-mono)', color: isAvailable ? 'var(--ln-amber)' : 'var(--ln-text-muted)' }}>
                ▲ {displayPayout.toLocaleString()}
                {affinityMultiplier > 0 && (
                  <span style={{ fontSize: 10, letterSpacing: '0.12em', color: 'var(--ln-ok)', marginLeft: 6 }}>+{Math.round(affinityMultiplier * 100)}%</span>
                )}
              </div>
              {!isStoryMission && (
                <div style={{ font: '600 9px var(--ln-font-mono)', color: 'var(--ln-cyan)', letterSpacing: '0.1em', textTransform: 'uppercase', marginTop: 2 }}>
                  +{affinityReward} Affinity
                </div>
              )}
            </div>
            {isAvailable ? (
              <button
                type="button"
                data-testid={`mission-card-${mission.id}-cta`}
                onClick={e => { e.stopPropagation(); unlocked && onPick() }}
                style={{ border: 'none', cursor: 'pointer', font: '700 11px var(--ln-font-display)', letterSpacing: '0.14em', color: 'var(--ln-text-on-cyan)', background: 'var(--ln-cyan)', padding: '6px 12px', textTransform: 'uppercase' }}
              >
                {targetCount} target{targetCount !== 1 ? 's' : ''} ›
              </button>
            ) : (
              <span style={{ font: '700 10px var(--ln-font-mono)', letterSpacing: '0.08em', color: stateTone?.color, border: `1px solid ${stateTone?.color}`, padding: '5px 10px', textTransform: 'uppercase' }}>
                {statusCta}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function DossierStat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{ minWidth: 0, padding: '6px 5px', borderRadius: 4, background: 'rgba(8,16,28,0.72)', border: `1px solid ${color}44` }}>
      <div style={{ font: '700 7px var(--ln-font-mono)', color: 'var(--ln-text-muted)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>{label}</div>
      <div style={{ font: '800 10px var(--ln-font-display)', color, marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', textTransform: 'uppercase' }}>{value}</div>
    </div>
  )
}
