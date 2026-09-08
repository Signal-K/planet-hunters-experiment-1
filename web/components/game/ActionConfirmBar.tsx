'use client'

import React from 'react'

interface ActionConfirmBarProps {
  eyebrow: string
  title: string
  description: string
  confirmLabel: string
  onConfirm: () => void
  onDismiss: () => void
}

/** A non-blocking confirmation rail anchored to the active operation page. */
export default function ActionConfirmBar({ eyebrow, title, description, confirmLabel, onConfirm, onDismiss }: ActionConfirmBarProps) {
  return (
    <aside className="ln-action-confirm" data-testid="action-confirm-bar" aria-label={title}>
      <div className="ln-action-confirm__copy">
        <span>{eyebrow}</span>
        <strong>{title}</strong>
        <p>{description}</p>
      </div>
      <div className="ln-action-confirm__actions">
        <button type="button" onClick={onDismiss} data-testid="confirm-action-dismiss">CANCEL</button>
        <button type="button" className="is-primary" onClick={onConfirm} data-testid="confirm-action-confirm">{confirmLabel}</button>
      </div>
    </aside>
  )
}
