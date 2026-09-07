'use client'

import React from 'react'
import { PrimaryBtn } from '@/components/ui/Button'
import { CLIENTS } from '@/lib/data/clients'
import { TARGETS } from '@/lib/data/targets'
import PageSurface from '@/components/ui/PageSurface'

interface TerritoryClaimPopupProps {
  targetId: string
  clientId: string
  onDismiss: () => void
}

export default function TerritoryClaimPopup({ targetId, clientId, onDismiss }: TerritoryClaimPopupProps) {
  const client = CLIENTS[clientId]
  const target = TARGETS.find(t => t.id === targetId)

  const clientName = client?.name ?? clientId
  const targetName = target?.name ?? targetId

  return (
    <PageSurface
      zIndex={200}
      ariaLabel="Territory established"
      contentStyle={{
        background: 'var(--ln-panel)',
        border: '1px solid var(--ln-hairline)',
        padding: '32px 24px',
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
      }}
    >
        <div style={{
          fontFamily: 'var(--ln-font-display)',
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: '0.22em',
          textTransform: 'uppercase',
          color: 'var(--ln-cyan)',
        }}>
          Territory Established
        </div>
        <div style={{
          fontFamily: 'var(--ln-font-display)',
          fontSize: 22,
          fontWeight: 800,
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
          color: 'var(--ln-text)',
          lineHeight: 1.2,
        }}>
          Claim Confirmed
        </div>
        <div style={{
          fontFamily: 'var(--ln-font-display)',
          fontSize: 13,
          fontWeight: 600,
          color: 'var(--ln-amber)',
          letterSpacing: '0.02em',
        }}>
          {clientName} now operates from {targetName}
        </div>
        <div style={{
          fontFamily: 'var(--ln-font-body)',
          fontSize: 13,
          color: 'var(--ln-text-dim)',
          lineHeight: 1.5,
        }}>
          Your rover has been deployed and will transmit data back to base. The client holds operational claim — no restrictions apply to you or other pilots.
        </div>
        <PrimaryBtn onClick={onDismiss}>UNDERSTOOD</PrimaryBtn>
    </PageSurface>
  )
}
