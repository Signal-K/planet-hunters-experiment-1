'use client'

import React from 'react'
import Sheet from '@/components/ui/Sheet'
import ClientMark from '@/components/ui/ClientMark'
import type { Client, MineralMeta } from '@/lib/data'

const UI_ROLE_LABEL: Record<Client['uiRole'], string> = {
  starter: 'Starter Operations',
  bulk: 'Bulk Freight',
  prospect: 'Prospecting',
  command: 'Command Reserve',
  science: 'Research',
}

// Per-client detail card (STS-235) — tapped from a client's mark on the
// Mission Board. Real, already-modeled client data only (mineral
// preferences, payout premium, affinity mechanic) — no invented lore or
// backstory, per the narrative rule (real science/real terminology, no
// fictional wrapper on mainline content).
export default function ClientDossierSheet({
  client,
  mineralMeta,
  onDismiss,
}: {
  client: Client
  mineralMeta: Record<string, MineralMeta>
  onDismiss: () => void
}) {
  return (
    <Sheet onDismiss={onDismiss} testId="client-dossier-sheet" ariaLabel={`${client.name} dossier`}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 18 }}>
        <ClientMark initial={client.initial} color={client.color} uiRole={client.uiRole} clientId={client.id} size={52} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: 'var(--ln-font-display)', fontSize: 9, fontWeight: 700, letterSpacing: '0.2em', color: client.color, textTransform: 'uppercase' }}>
            {UI_ROLE_LABEL[client.uiRole]}
          </div>
          <div style={{ fontFamily: 'var(--ln-font-display)', fontWeight: 800, fontSize: 20, color: 'var(--ln-text)', letterSpacing: '0.02em' }}>
            {client.name}
          </div>
          <div style={{ fontFamily: 'var(--ln-font-mono)', fontSize: 10, letterSpacing: '0.1em', color: 'var(--ln-text-muted)', textTransform: 'uppercase' }}>
            {client.projectType}
          </div>
        </div>
      </div>

      <div style={{ marginBottom: 14 }}>
        <div style={{ fontFamily: 'var(--ln-font-display)', fontSize: 8, fontWeight: 700, letterSpacing: '0.22em', color: 'var(--ln-text-muted)', textTransform: 'uppercase', marginBottom: 6 }}>
          Wants
        </div>
        <div style={{ fontFamily: 'var(--ln-font-body)', fontSize: 13, color: 'var(--ln-text-dim)', lineHeight: 1.5 }}>
          {client.mineralPreferences.map(id => mineralMeta[id]?.name ?? id).join(', ')}
          {' '}· +{Math.round(client.payoutPremium * 100)}% pay over open-market rate
        </div>
        {client.payoutNotes && (
          <div style={{ marginTop: 4, fontFamily: 'var(--ln-font-body)', fontSize: 12, color: 'var(--ln-text-muted)', lineHeight: 1.4 }}>
            {client.payoutNotes}
          </div>
        )}
      </div>

      <div>
        <div style={{ fontFamily: 'var(--ln-font-display)', fontSize: 8, fontWeight: 700, letterSpacing: '0.22em', color: 'var(--ln-text-muted)', textTransform: 'uppercase', marginBottom: 6 }}>
          Affinity
        </div>
        <div style={{ fontFamily: 'var(--ln-font-body)', fontSize: 13, color: 'var(--ln-text-dim)', lineHeight: 1.5 }}>
          {client.affinityNotes ?? `+${Math.round(client.affinityBonusPerMission * 100)}% payout per completed ${client.name} job.`}
        </div>
      </div>
    </Sheet>
  )
}
