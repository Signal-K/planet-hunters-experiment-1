'use client'

import React from 'react'
import styles from './AvailableActionsPanel.module.css'

export type AvailableActionKind = 'mission' | 'infrastructure' | 'structure' | 'research'

export interface AvailableAction {
  id: string
  kind: AvailableActionKind
  eyebrow: string
  title: string
  detail: string
  cta: string
  onClick: () => void
  primary?: boolean
  testId?: string
}

function ActionGlyph({ kind }: { kind: AvailableActionKind }) {
  if (kind === 'mission') {
    return <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="3" width="16" height="18" rx="2" /><path d="M8 8h8M8 12h8M8 16h5" /></svg>
  }
  if (kind === 'infrastructure') {
    return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 18h14M7 18V9l5-4 5 4v9M9 18v-5h6v5M12 5V2M9 3h6" /></svg>
  }
  if (kind === 'structure') {
    return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 21h16M6 21V9l6-5 6 5v12M10 21v-6h4v6" /></svg>
  }
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 3 2.3 6.7H21l-5.4 4.1 2.1 6.8-5.7-4.2-5.7 4.2 2.1-6.8L3 9.7h6.7L12 3Z" /></svg>
}

export default function AvailableActionsPanel({ actions, className = '' }: { actions: AvailableAction[]; className?: string }) {
  if (actions.length === 0) return null

  return (
    <section className={`${styles.panel} ${className}`} data-testid="available-actions-panel" aria-labelledby="available-actions-heading">
      <div className={styles.header}>
        <div>
          <span className={styles.kicker}><i /> AVAILABLE NOW</span>
          <h2 id="available-actions-heading">Program actions</h2>
        </div>
        <span className={styles.count}>{actions.length.toString().padStart(2, '0')} OPEN</span>
      </div>
      <div className={styles.grid}>
        {actions.map(action => (
          <button
            key={action.id}
            className={`${styles.action} ${action.primary ? styles.primary : ''}`}
            data-testid={action.testId}
            onClick={action.onClick}
          >
            <span className={styles.icon}><ActionGlyph kind={action.kind} /></span>
            <span className={styles.copy}>
              <span className={styles.eyebrow}>{action.eyebrow}</span>
              <strong>{action.title}</strong>
              <span className={styles.detail}>{action.detail}</span>
            </span>
            <span className={styles.cta}>{action.cta} <b>›</b></span>
          </button>
        ))}
      </div>
    </section>
  )
}
