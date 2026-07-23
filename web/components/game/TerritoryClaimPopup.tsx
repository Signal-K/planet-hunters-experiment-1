'use client'

import React from 'react'
import { PrimaryBtn } from '@/components/ui/Button'
import { CONTRACTORS } from '@/lib/data/contractors'
import { TARGETS } from '@/lib/data/targets'
import Sheet from '@/components/ui/Sheet'

interface TerritoryClaimPopupProps {
  targetId: string
  contractorId: string
  onDismiss: () => void
}

export default function TerritoryClaimPopup({ targetId, contractorId, onDismiss }: TerritoryClaimPopupProps) {
  const contractor = CONTRACTORS[contractorId]
  const target = TARGETS.find(t => t.id === targetId)

  const contractorName = contractor?.name ?? contractorId
  const targetName = target?.name ?? targetId

  return (
    <Sheet
      variant="centered"
      onDismiss={onDismiss}
      dismissOnBackdrop={false}
      zIndex={200}
      ariaLabel="Territory established"
      scrimStyle={{ background: 'rgba(6, 9, 15, 0.88)' }}
      panelStyle={{
        background: 'var(--ln-panel)',
        border: '1px solid var(--ln-hairline)',
        borderRadius: 16,
        padding: '32px 24px',
        width: '100%',
        maxWidth: 360,
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
          {contractorName} now operates from {targetName}
        </div>
        <div style={{
          fontFamily: 'var(--ln-font-body)',
          fontSize: 13,
          color: 'var(--ln-text-dim)',
          lineHeight: 1.5,
        }}>
          Your rover has been deployed and will transmit data back to base. The contractor holds operational claim — no restrictions apply to you or other pilots.
        </div>
        <PrimaryBtn onClick={onDismiss}>UNDERSTOOD</PrimaryBtn>
    </Sheet>
  )
}
