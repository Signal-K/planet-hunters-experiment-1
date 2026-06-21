'use client'

import React, { useState, useEffect } from 'react'
import Image from 'next/image'
import TopBar from '@/components/ui/TopBar'
import Panel from '@/components/ui/Panel'
import StatusPill from '@/components/ui/StatusPill'
import { compatibleTargetsFor, contractorAffinityBonus, contractorUnlocked } from '@/lib/data'
import type { Catalog } from '@/lib/catalog'

interface MissionBoardScreenProps {
  onBack: () => void
  onPick: (id: string) => void
  missionsDone: number
  freeOperations: boolean
  hasCoach?: boolean
  catalog: Catalog
  contractorMissions?: Record<string, number>
  contractorCooldowns?: Record<string, number>
}

function formatCooldown(remaining: number): string {
  if (remaining <= 0) return '0m'
  const mins = Math.ceil(remaining / 60000)
  if (mins >= 60) return `${Math.floor(mins / 60)}h ${mins % 60}m`
  const secs = Math.ceil((remaining % 60000) / 1000)
  return `${mins}m ${secs}s`
}

export default function MissionBoardScreen({ onBack, onPick, missionsDone, freeOperations, hasCoach, catalog, contractorMissions, contractorCooldowns }: MissionBoardScreenProps) {
  const { missions: MISSIONS, contractors: CONTRACTORS, minerals: MINERAL_META, targets } = catalog
  const [tick, setTick] = useState(Date.now())
  useEffect(() => {
    const id = setInterval(() => setTick(Date.now()), 10000)
    return () => clearInterval(id)
  }, [])
  const now = tick
  const isOnCooldown = (contractor: string) => {
    if (!contractorCooldowns) return false
    const expiry = contractorCooldowns[contractor]
    return expiry && expiry > now
  }
  const sequence = missionsDone + 1
  const available = MISSIONS.filter(m => {
    const contractor = CONTRACTORS[m.contractor]
    return !!contractor && (freeOperations || contractorUnlocked(contractor, sequence)) && (freeOperations || m.sequence === sequence)
  })

  const onboardingComplete = !freeOperations && available.length === 0 && missionsDone >= 1

  if (onboardingComplete) {
    return (
      <div style={{ width: '100%', height: '100%', position: 'relative', background: '#06090f' }}>
        <div style={{ position: 'absolute', inset: 0 }}>
          <Image src="/earth-day.jpg" alt="" fill style={{ objectFit: 'cover', filter: 'brightness(0.18) saturate(0.6)' }} />
        </div>
        <TopBar eyebrow="EARTH BASE · COMPLETE" title="Mission Board" onBack={onBack} />
        <div style={{
          position: 'absolute', inset: 0, paddingTop: 72,
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          padding: '72px 32px 64px',
        }}>
          <div style={{
            width: 64, height: 64, borderRadius: 999, marginBottom: 24,
            background: 'radial-gradient(circle at 38% 36%, #7ec8ff33, #1a3a5c22)',
            border: '1.5px solid rgba(126,200,255,0.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
              <circle cx="14" cy="14" r="10" stroke="#7ec8ff" strokeWidth="1.5" strokeDasharray="3 2" />
              <circle cx="14" cy="14" r="3.5" fill="#7ec8ff" opacity="0.7" />
            </svg>
          </div>

          <div style={{ fontFamily: 'var(--ln-font-display)', fontSize: 10, fontWeight: 700, letterSpacing: '0.22em', color: 'var(--ln-cyan)', textTransform: 'uppercase', marginBottom: 10 }}>
            Training Arc Complete
          </div>
          <div style={{ fontFamily: 'var(--ln-font-display)', fontWeight: 800, fontSize: 22, color: '#e6efff', textAlign: 'center', lineHeight: 1.25, marginBottom: 16 }}>
            Three Operations Down
          </div>
          <div style={{ fontFamily: 'var(--ln-font-body)', fontSize: 14, color: '#7a96b4', textAlign: 'center', lineHeight: 1.6, maxWidth: 280, marginBottom: 32 }}>
            You&apos;ve completed the current build of Landnám. The next phase — Free Ops, contractor board, and the full asteroid belt — is on its way.
          </div>

          <div style={{
            padding: '12px 16px', borderRadius: 10,
            border: '1px solid rgba(126,200,255,0.15)',
            background: 'rgba(8,16,28,0.6)',
            fontFamily: 'var(--ln-font-mono)', fontSize: 11,
            color: '#4a6a88', letterSpacing: '0.14em', textAlign: 'center',
            textTransform: 'uppercase',
          }}>
            More missions loading · Sprint 5
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative', background: '#06090f' }}>
      <div style={{ position: 'absolute', inset: 0 }}>
        <Image src="/earth-day.jpg" alt="" fill style={{ objectFit: 'cover', filter: 'brightness(0.3)' }} />
      </div>
        <TopBar eyebrow={freeOperations ? 'EARTH BASE · FREE OPS' : `EARTH BASE · L${missionsDone + 1}`} title="Mission Board" onBack={onBack} />

      <div style={{ position: 'absolute', inset: 0, paddingTop: hasCoach ? 110 : 72, paddingBottom: hasCoach ? 190 : 96, overflowY: 'auto' }}>
        <div style={{ padding: '0 14px 8px 14px', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontFamily: 'var(--ln-font-display)', fontSize: 10, fontWeight: 700, letterSpacing: '0.22em', color: 'var(--ln-text-muted)', textTransform: 'uppercase' }}>
            Active Contracts · {available.length}
          </span>
          <span style={{ flex: 1 }} />
          <StatusPill kind="amber" dim>Sort · Payout</StatusPill>
        </div>

        <div style={{ padding: '0 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {MISSIONS.map(m => {
            const cooldown = isOnCooldown(m.contractor)
            const contractor = CONTRACTORS[m.contractor]
            if (!contractor) return null
            const contractorReady = freeOperations || contractorUnlocked(contractor, sequence)
            const unlocked = !cooldown && contractorReady && (freeOperations || available.some(item => item.id === m.id))
            const mTargets = compatibleTargetsFor(m, targets)
            const accent = contractor.color
            const affinityMultiplier = contractorAffinityBonus(contractor, contractorMissions?.[contractor.id] ?? 0)
            const affinityBonus = Math.round(m.payout.francs * affinityMultiplier)
            const displayPayout = m.payout.francs + affinityBonus
            return (
              <button key={m.id} data-mission-id={m.id} data-testid={`mission-card-${m.id}`} onClick={() => unlocked && onPick(m.id)} style={{ background: 'transparent', border: 'none', padding: 0, textAlign: 'left', cursor: unlocked ? 'pointer' : 'not-allowed', opacity: unlocked ? 1 : 0.5, outline: '2px solid transparent', outlineOffset: 2 }} className="mission-card-btn">
                <Panel accent={accent} style={{ padding: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                    <div style={{ width: 44, height: 44, flexShrink: 0, borderRadius: 999, background: `${accent}22`, border: `1.5px solid ${accent}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--ln-font-display)', fontWeight: 800, fontSize: 13, color: accent }}>
                      {contractor.initial}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontFamily: 'var(--ln-font-display)', fontSize: 9, fontWeight: 700, letterSpacing: '0.2em', color: accent, textTransform: 'uppercase' }}>{contractor.name}</span>
                        <span style={{ fontFamily: 'var(--ln-font-mono)', fontSize: 9, letterSpacing: '0.16em', color: '#5d7390', textTransform: 'uppercase', marginLeft: 'auto' }}>{m.tag}</span>
                      </div>
                      <div style={{ fontFamily: 'var(--ln-font-display)', fontWeight: 800, fontSize: 16, color: '#e6efff', marginTop: 2 }}>{m.title}</div>
                      <div style={{ fontFamily: 'var(--ln-font-mono)', fontSize: 9, color: '#7ec8ff', letterSpacing: '0.1em', textTransform: 'uppercase', marginTop: 2 }}>Wants · {contractor.mineralPreferences.join(' / ')} · +{Math.round(contractor.payoutPremium * 100)}%</div>
                      <div style={{ fontFamily: 'var(--ln-font-body)', fontSize: 12, color: '#a9b8ce', marginTop: 2, lineHeight: 1.4 }}>{m.brief}</div>
                    </div>
                  </div>

                  <div style={{ marginTop: 10, display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
                    {Object.entries(m.requires.minerals).map(([k, v]) => {
                      const meta = MINERAL_META[k]
                      return (
                        <div key={k} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '3px 8px', background: 'rgba(8,16,28,0.7)', border: `1px solid ${meta.color}55`, borderRadius: 6 }}>
                          <span style={{ fontFamily: 'var(--ln-font-mono)', fontSize: 10, fontWeight: 800, color: meta.color }}>{meta.sym}</span>
                          <span style={{ fontFamily: 'var(--ln-font-display)', fontSize: 11, fontWeight: 800, color: meta.color }}>×{v}</span>
                        </div>
                      )
                    })}
                    <span style={{ flex: 1 }} />
                    <StatusPill kind={m.difficulty.startsWith('L') && parseInt(m.difficulty.slice(1)) > 2 ? 'crit' : 'info'} dim>{m.difficulty}</StatusPill>
                  </div>

                  <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 10, paddingTop: 10, borderTop: '1px dashed rgba(63,169,255,0.18)' }}>
                    <div style={{ fontFamily: 'var(--ln-font-display)', fontWeight: 800, fontSize: 18, color: '#f5a623' }}>▲ {displayPayout.toLocaleString()}</div>
                    <span style={{ fontFamily: 'var(--ln-font-mono)', fontSize: 11, letterSpacing: '0.16em', color: '#7ec8ff' }}>+{m.payout.affinity} AFF</span>
                    {affinityBonus > 0 && <span style={{ fontFamily: 'var(--ln-font-mono)', fontSize: 10, letterSpacing: '0.12em', color: '#39d36a' }}>+{Math.round(affinityMultiplier * 100)}%</span>}
                    <span style={{ flex: 1 }} />
                    {cooldown
                      ? <StatusPill kind="crit">Cooldown {formatCooldown(contractorCooldowns![m.contractor] - now)}</StatusPill>
                      : !unlocked
                        ? <StatusPill kind="mute">Locked · {!contractorReady ? `L${contractor.unlockTier}` : m.sequence <= missionsDone ? 'Completed' : m.unlockAt}</StatusPill>
                        : <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 8, background: accent, color: '#06121f', fontFamily: 'var(--ln-font-display)', fontWeight: 800, fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase' }}>
                            {mTargets.length} target{mTargets.length !== 1 ? 's' : ''} ›
                          </span>}
                  </div>
                </Panel>
              </button>

            )
          })}
        </div>
      </div>
    </div>
  )
}
