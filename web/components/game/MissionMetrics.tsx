'use client'

import type { Contractor, MineralMeta, Mission } from '@/lib/data'

interface MissionMetricsProps {
  mission: Mission
  contractor?: Contractor | null
  mineralMeta: Record<string, MineralMeta>
}

export default function MissionMetrics({ mission, contractor, mineralMeta }: MissionMetricsProps) {
  const mineralEntries = Object.entries(mission.requires.minerals)
  const affinityToCap = contractor ? Math.round(0.15 / contractor.affinityBonusPerMission) : 0

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 1, margin: '8px 14px 0', borderRadius: 4, overflow: 'hidden', background: 'var(--ln-border)' }}>
      <div style={{ padding: '6px 8px', background: 'var(--ln-panel-2)' }}>
        <MetricLabel>Cargo</MetricLabel>
        {mineralEntries.length === 0 ? (
          <div style={{ font: '800 12px var(--ln-font-display)', color: 'var(--ln-text-muted)' }}>Any</div>
        ) : (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {mineralEntries.map(([id, quantity]) => {
              const meta = mineralMeta[id]
              return (
                <span key={id} style={{ display: 'inline-flex', alignItems: 'center', gap: 3, font: '800 11px var(--ln-font-display)', color: meta?.color ?? 'var(--ln-text)' }}>
                  <span style={{ width: 7, height: 7, borderRadius: 2, background: meta?.color ?? 'var(--ln-border)', flexShrink: 0 }} />
                  <span>{meta?.name ?? id}</span>
                  <span style={{ color: 'var(--ln-text-muted)', fontSize: 9 }}>({meta?.sym ?? id})</span>
                  <span style={{ color: 'var(--ln-text)' }}>×{quantity}</span>
                </span>
              )
            })}
          </div>
        )}
      </div>

      <div title={contractor ? contractor.payoutNotes : undefined} style={{ padding: '6px 8px', background: 'var(--ln-panel-2)', cursor: contractor ? 'help' : undefined }}>
        <MetricLabel>Payout bonus</MetricLabel>
        <div style={{ font: '800 12px var(--ln-font-display)', color: contractor ? 'var(--ln-cyan)' : 'var(--ln-text-muted)' }}>
          {contractor ? `+${Math.round(contractor.payoutPremium * 100)}%` : 'None'}
        </div>
      </div>

      <div style={{ padding: '6px 8px', background: 'var(--ln-panel-2)' }}>
        <MetricLabel>Affinity</MetricLabel>
        {contractor ? (
          <>
            <div style={{ font: '800 12px var(--ln-font-display)', color: 'var(--ln-text)' }}>
              +{Math.round(contractor.affinityBonusPerMission * 1000) / 10}%<span style={{ fontSize: 10, fontWeight: 600 }}>/job</span>
            </div>
            <div style={{ font: '600 8px var(--ln-font-mono)', color: 'var(--ln-text-muted)', marginTop: 2 }}>{affinityToCap} to cap</div>
          </>
        ) : (
          <div style={{ font: '800 12px var(--ln-font-display)', color: 'var(--ln-text-muted)' }}>None</div>
        )}
      </div>
    </div>
  )
}

function MetricLabel({ children }: { children: string }) {
  return <div style={{ font: '700 8px var(--ln-font-mono)', color: 'var(--ln-text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 4 }}>{children}</div>
}
