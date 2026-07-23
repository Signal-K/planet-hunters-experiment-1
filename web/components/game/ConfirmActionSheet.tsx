'use client'

import React from 'react'
import Sheet from '@/components/ui/Sheet'

interface ConfirmActionSheetProps {
  eyebrow: string
  title: string
  description: string
  confirmLabel: string
  onConfirm: () => void
  onDismiss: () => void
}

// Bottom-sheet confirm/cancel gate for costly, irreversible actions —
// same slide-up shape as SaveProgressPrompt, but for a plain confirm
// rather than a form. First use: Upgrade Launchpad fired immediately on
// click for a flat ₣1B with no confirmation step.
export default function ConfirmActionSheet({ eyebrow, title, description, confirmLabel, onConfirm, onDismiss }: ConfirmActionSheetProps) {
  return (
    <Sheet
      onDismiss={onDismiss}
      panelStyle={{
        background: 'linear-gradient(180deg, #0d1c30, #060d18)',
        border: '1px solid rgba(245,166,35,0.5)',
        padding: '18px 16px 26px',
        boxShadow: '0 -12px 40px rgba(0,0,0,0.6)',
      }}
      handleContainerStyle={{ marginBottom: 10 }}
      handleStyle={{ background: 'rgba(255,255,255,0.25)' }}
    >

        <div style={{ fontFamily: 'var(--ln-font-display)', fontSize: 9, fontWeight: 800, letterSpacing: '0.22em', color: 'var(--ln-amber)', textTransform: 'uppercase' }}>{eyebrow}</div>
        <div style={{ fontFamily: 'var(--ln-font-display)', fontSize: 18, fontWeight: 800, color: '#e6efff', marginTop: 2 }}>{title}</div>
        <div style={{ fontFamily: 'var(--ln-font-body)', fontSize: 12, color: '#a9b8ce', marginTop: 4, lineHeight: 1.4 }}>
          {description}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 14 }}>
          <button
            type="button"
            onClick={onConfirm}
            data-testid="confirm-action-confirm"
            style={{
              width: '100%', padding: '15px', borderRadius: 12, border: 'none', cursor: 'pointer',
              background: 'linear-gradient(180deg, #ffcf7a 0%, #f5a623 100%)',
              color: '#06121f',
              fontFamily: 'var(--ln-font-display)', fontSize: 14, fontWeight: 800,
              letterSpacing: '0.12em', textTransform: 'uppercase',
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.4), 0 4px 0 rgba(0,0,0,0.3)',
            }}
          >
            {confirmLabel}
          </button>
          <button
            type="button"
            onClick={onDismiss}
            data-testid="confirm-action-dismiss"
            style={{
              background: 'transparent', border: 'none', cursor: 'pointer',
              fontFamily: 'var(--ln-font-body)', fontSize: 12, color: '#5d7390',
              textDecoration: 'underline', padding: 4,
            }}
          >
            Cancel
          </button>
        </div>
    </Sheet>
  )
}
