'use client'

import React from 'react'
import { CLIENT_SLOTS, MAX_AFFINITY_BONUS, clientAffinityBonus, clientUnlocked } from '@/lib/data'
import Sheet from '@/components/ui/Sheet'

interface ClientBonusGuideSheetProps {
  onClose: () => void
  // Optional live-state props — omit either to show the guide as reference-only.
  clientMissions?: Record<string, number>
  sequence?: number
}

function pct(n: number): string {
  const v = Math.round(n * 1000) / 10
  return `${v % 1 === 0 ? v.toFixed(0) : v.toFixed(1)}%`
}

// Jobs needed to reach the affinity cap at a given per-job rate — used to
// group clients by "how long until this relationship maxes out" rather than
// showing the same +15% cap number thirteen times with no distinguishing
// information.
function jobsToCap(ratePerJob: number): number {
  return Math.ceil(MAX_AFFINITY_BONUS / ratePerJob)
}

export default function ClientBonusGuideSheet({ onClose, clientMissions, sequence }: ClientBonusGuideSheetProps) {
  const rateGroups = Array.from(new Set(CLIENT_SLOTS.map(c => c.affinityBonusPerMission))).sort((a, b) => a - b)

  return (
    <Sheet
      className="theme-light"
      onDismiss={onClose}
      zIndex={200}
      scrimStyle={{ background: 'rgba(28,26,20,0.45)', backdropFilter: 'blur(6px)' }}
      panelTestId="client-bonus-guide-sheet"
      panelStyle={{
          background: 'var(--ln-surface)',
          border: '1px solid var(--ln-hairline)',
          padding: '20px 20px 32px',
          maxHeight: '86vh', overflowY: 'auto',
          boxShadow: 'var(--ln-shadow-modal)',
      }}
      handleContainerStyle={{ marginBottom: 24 }}
      handleStyle={{ width: 36, height: 3, background: 'var(--ln-hairline-strong)' }}
    >

        {/* Header */}
        <div style={{ marginBottom: 28 }}>
          <div style={{
            fontFamily: 'var(--ln-font-display)', fontSize: 9, fontWeight: 800,
            letterSpacing: '0.24em', color: 'var(--ln-text-muted)', textTransform: 'uppercase',
            marginBottom: 8,
          }}>
            Landnam · Client Reference
          </div>
          <div style={{
            fontFamily: 'var(--ln-font-display)', fontSize: 24, fontWeight: 800,
            color: 'var(--ln-text)', letterSpacing: '-0.01em', lineHeight: 1.1, marginBottom: 8,
          }}>
            Client Bonuses
          </div>
          <div style={{ fontFamily: 'var(--ln-font-body)', fontSize: 13, color: 'var(--ln-text-muted)', lineHeight: 1.5 }}>
            Each client pays differently. Know the system before picking a job.
          </div>
        </div>

        {/* Bonus types */}
        <SectionLabel>Bonus Types</SectionLabel>
        <div style={{ display: 'grid', gap: 1, background: 'var(--ln-divider)', borderRadius: 10, overflow: 'hidden', marginBottom: 28 }}>
          <div style={{ background: 'var(--ln-surface-2)', padding: '18px 16px' }}>
            <div style={{ fontFamily: 'var(--ln-font-display)', fontSize: 15, fontWeight: 800, color: 'var(--ln-text)', marginBottom: 4 }}>Premium</div>
            <div style={{ fontFamily: 'var(--ln-font-display)', fontSize: 28, fontWeight: 800, color: 'var(--ln-amber)', letterSpacing: '-0.02em', lineHeight: 1, marginBottom: 8 }}>Varies by client</div>
            <div style={{ fontFamily: 'var(--ln-font-body)', fontSize: 12.5, color: 'var(--ln-text-muted)', lineHeight: 1.55 }}>
              A flat bonus the client offers on every job, regardless of history. It never changes — you get it on job one and job fifty.
            </div>
          </div>
          <div style={{ background: 'var(--ln-surface-2)', padding: '18px 16px' }}>
            <div style={{ fontFamily: 'var(--ln-font-display)', fontSize: 15, fontWeight: 800, color: 'var(--ln-text)', marginBottom: 4 }}>Affinity</div>
            <div style={{ fontFamily: 'var(--ln-font-display)', fontSize: 28, fontWeight: 800, color: 'var(--ln-amber)', letterSpacing: '-0.02em', lineHeight: 1, marginBottom: 8 }}>+{pct(rateGroups[0])}–{pct(rateGroups[rateGroups.length - 1])} / job</div>
            <div style={{ fontFamily: 'var(--ln-font-body)', fontSize: 12.5, color: 'var(--ln-text-muted)', lineHeight: 1.55 }}>
              Earned each time you complete a job for this client. Builds over time. Once you hit the cap it stops growing, but it stays at the cap.
            </div>
          </div>
        </div>

        {/* The cap */}
        <SectionLabel>The Cap</SectionLabel>
        <div style={{ background: 'var(--ln-cyan-soft)', border: '1px solid var(--ln-cyan-border)', borderRadius: 10, padding: '18px 16px', marginBottom: 28 }}>
          <div style={{ fontFamily: 'var(--ln-font-display)', fontSize: 15, fontWeight: 800, color: 'var(--ln-text)', marginBottom: 2 }}>Affinity cap</div>
          <div style={{ fontFamily: 'var(--ln-font-display)', fontSize: 28, fontWeight: 800, color: 'var(--ln-amber)', letterSpacing: '-0.02em', lineHeight: 1, marginBottom: 14 }}>+{pct(MAX_AFFINITY_BONUS)}</div>
          <div style={{ fontFamily: 'var(--ln-font-body)', fontSize: 12, color: 'var(--ln-text-muted)', lineHeight: 1.5, marginBottom: 14 }}>
            Every client caps at the same +{pct(MAX_AFFINITY_BONUS)}, but each client's per-job rate is different — so the number of jobs it takes to reach it varies.
          </div>
          <div style={{ display: 'grid', gap: 6 }}>
            {rateGroups.map(rate => (
              <div key={rate} style={{ display: 'flex', alignItems: 'baseline', gap: 12, fontSize: 12 }}>
                <span style={{ fontFamily: 'var(--ln-font-display)', fontWeight: 700, color: 'var(--ln-text)', minWidth: 62 }}>+{pct(rate)}/job</span>
                <span style={{ fontFamily: 'var(--ln-font-display)', fontWeight: 700, color: 'var(--ln-amber)', minWidth: 76 }}>{jobsToCap(rate)} jobs to cap</span>
                <span style={{ fontFamily: 'var(--ln-font-body)', color: 'var(--ln-text-muted)' }}>
                  {CLIENT_SLOTS.filter(c => c.affinityBonusPerMission === rate).map(c => c.initial).join(' · ')}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Comparing clients */}
        <SectionLabel>Comparing Clients</SectionLabel>
        <div style={{ display: 'grid', gap: 2, marginBottom: 28 }}>
          {CLIENT_SLOTS.slice().sort((a, b) => a.unlockTier - b.unlockTier).map(client => {
            const completed = clientMissions?.[client.id] ?? 0
            const affinityEarned = clientAffinityBonus({ ...client }, completed)
            const total = client.payoutPremium + affinityEarned
            const locked = sequence !== undefined && !clientUnlocked({ ...client }, sequence)

            return (
              <div
                key={client.id}
                data-testid={`client-bonus-row-${client.id}`}
                style={{
                  display: 'grid', gridTemplateColumns: '40px 1fr auto', gap: 12,
                  alignItems: 'center', padding: '12px 4px',
                  borderBottom: '1px solid var(--ln-divider)',
                  opacity: locked ? 0.45 : 1,
                }}
              >
                <div style={{
                  width: 40, height: 40, borderRadius: '50%', background: client.color,
                  display: 'grid', placeItems: 'center',
                  fontFamily: 'var(--ln-font-display)', fontSize: 12, fontWeight: 800,
                  color: '#06090f', letterSpacing: '0.02em',
                }}>
                  {client.initial}
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontFamily: 'var(--ln-font-display)', fontSize: 13, fontWeight: 700, color: 'var(--ln-text)', marginBottom: 2 }}>{client.name}</div>
                  <div style={{ fontFamily: 'var(--ln-font-body)', fontSize: 11.5, color: 'var(--ln-text-muted)' }}>
                    {locked
                      ? `Locked · Tier ${client.unlockTier}`
                      : `+${pct(client.payoutPremium)} premium · ${completed > 0 ? `+${pct(affinityEarned)} affinity earned` : 'no affinity yet'}`}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontFamily: 'var(--ln-font-display)', fontSize: 19, fontWeight: 800, color: 'var(--ln-amber)', letterSpacing: '-0.01em' }}>
                    {locked ? '—' : `+${pct(total)}`}
                  </div>
                  {!locked && (
                    <div style={{ fontFamily: 'var(--ln-font-display)', fontSize: 8.5, fontWeight: 700, letterSpacing: '0.1em', color: 'var(--ln-text-muted)', textTransform: 'uppercase' }}>
                      Total Now
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {/* Rule callout */}
        <div style={{ padding: '14px 16px', borderLeft: '2px solid var(--ln-amber)', background: 'var(--ln-amber-soft)', borderRadius: '0 8px 8px 0', marginBottom: 24 }}>
          <div style={{ fontFamily: 'var(--ln-font-body)', fontSize: 12.5, color: 'var(--ln-text-muted)', lineHeight: 1.55 }}>
            A new client with a high Premium can look better on paper. <strong style={{ color: 'var(--ln-text)', fontWeight: 700 }}>Check the total</strong> — a client you have built Affinity with often pays more.
          </div>
        </div>

        <button
          data-testid="client-bonus-guide-close"
          onClick={onClose}
          style={{
            width: '100%', padding: '14px',
            background: 'var(--ln-cyan-soft)',
            border: '1px solid var(--ln-cyan-border)',
            borderRadius: 12,
            color: 'var(--ln-cyan)',
            fontFamily: 'var(--ln-font-display)', fontSize: 12, fontWeight: 800,
            letterSpacing: '0.14em', textTransform: 'uppercase',
            cursor: 'pointer',
          }}
        >
          Got It
        </button>
    </Sheet>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
      <span style={{
        fontFamily: 'var(--ln-font-display)', fontSize: 10, fontWeight: 700,
        letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--ln-text-muted)',
        whiteSpace: 'nowrap',
      }}>
        {children}
      </span>
      <span style={{ flex: 1, height: 1, background: 'var(--ln-divider)' }} />
    </div>
  )
}
