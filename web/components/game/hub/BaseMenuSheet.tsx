'use client'

import type { ReactNode } from 'react'
import styles from './BaseMenuSheet.module.css'

export interface BaseMenuItem {
  id: string
  label: string
  detail: string
  onSelect: () => void
}

/** The base's main menu: the places a player goes from the base, one plain row each (the old dock's options). */
export function BaseMenuSheet({ items, onClose }: { items: readonly BaseMenuItem[]; onClose: () => void }): ReactNode {
  return (
    <div className={styles.scrim} data-testid="base-menu" aria-label="Menu" onClick={onClose}>
      <div className={styles.sheet} onClick={event => event.stopPropagation()}>
        <div className={styles.head}>
          <span className={styles.title}>Menu</span>
          <button type="button" className={styles.close} data-testid="base-menu-close" aria-label="Close menu" onClick={onClose}>Close</button>
        </div>
        <ul className={styles.list}>
          {items.map(item => (
            <li key={item.id}>
              <button type="button" className={styles.row} data-testid={`base-menu-${item.id}`} onClick={() => { onClose(); item.onSelect() }}>
                <span className={styles.label}>{item.label}</span>
                <span className={styles.detail}>{item.detail}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
