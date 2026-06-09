'use client'

import React from 'react'
import Image from 'next/image'
import TopBar from '@/components/ui/TopBar'
import Panel from '@/components/ui/Panel'
import StatusPill from '@/components/ui/StatusPill'
import { compatibleTargetsFor } from '@/lib/data'
import type { Catalog } from '@/lib/catalog'

interface MissionBoardScreenProps {
  onBack: () => void
  onPick: (id: string) => void
  missionsDone: number
  controlBuilt: boolean
  freeOperations: boolean
  hasCoach?: boolean
  catalog: Catalog
  contractorCooldowns?: Record<string, number>
}

function formatCooldown(remaining: number): string {
  const mins = Math.ceil(remaining / 60000)
  if (mins >= 60) return `${Math.floor(mins / 60)}h ${mins % 60}m`
  return `${mins}m`
}

export default function MissionBoardScreen({ onBack, onPick, missionsDone, controlBuilt, freeOperations, hasCoach, catalog, contractorCooldowns }: MissionBoardScreenProps) {
  const { missions: MISSIONS, contractors: CONTRACTORS, minerals: MINERAL_META, targets } = catalog
  const now = Date.now()
  const isOnCooldown = (contractor: string) => {
    if (!contractorCooldowns) return false
    const expiry = contractorCooldowns[contractor]
    return expiry && expiry > now
  }
  const available = MISSIONS.filter(m => freeOperations || (m.sequence === missionsDone + 1 && (m.sequence === 1 || controlBuilt)))
  return (
    <div style={{ width: '100%', height: '100%', position: 'relative', background: '#06090f' }}>
      <div style={{ position: 'absolute', inset: 0 }}>
        <Image src="/earth-day.jpg" alt="" fill style={{ objectFit: 'cover', filter: 'brightness(0.3)' }} />
      </div>
      <TopBar eyebrow={freeOperations ? 'EARTH BASE · FREE OPS' : `EARTH BASE · M${Math.min(missionsDone + 1, 4)}`} title="Mission Board" onBack={onBack} />

      <div style={{ position: 'absolute', inset: 0, paddingTop: hasCoach ? 100 : 72, paddingBottom: hasCoach ? 180 : 96, overflowY: 'auto' }}>
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
            const unlocked = !cooldown && (freeOperations || available.some(item => item.id === m.id))
            const contractor = CONTRACTORS[m.contractor]
            const mTargets = compatibleTargetsFor(m, targets)
            const accent = contractor.color
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
                    <div style={{ fontFamily: 'var(--ln-font-display)', fontWeight: 800, fontSize: 18, color: '#f5a623' }}>▲ {m.payout.francs.toLocaleString()}</div>
                    <span style={{ fontFamily: 'var(--ln-font-mono)', fontSize: 11, letterSpacing: '0.16em', color: '#7ec8ff' }}>+{m.payout.xp} XP</span>
                    <span style={{ flex: 1 }} />
                    {cooldown
                      ? <StatusPill kind="crit">Cooldown {formatCooldown(contractorCooldowns![m.contractor] - now)}</StatusPill>
                      : !unlocked
                        ? <StatusPill kind="mute">Locked · {m.sequence <= missionsDone ? 'Completed' : m.unlockAt}</StatusPill>
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
