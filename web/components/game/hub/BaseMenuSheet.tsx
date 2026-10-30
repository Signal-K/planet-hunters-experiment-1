'use client'

import type { ReactNode } from 'react'
import styles from './BaseMenuSheet.module.css'

export type BaseMenuIcon = 'build' | 'mission' | 'market' | 'hangar' | 'station' | 'log' | 'subsurface' | 'friends' | 'settings' | 'research'

export interface BaseMenuItem {
  id: string
  label: string
  detail: string
  icon: BaseMenuIcon
  /** The few things a player does from the base: drawn larger, above the rest. */
  primary?: boolean
  onSelect: () => void
}

/** Line icons on a 24 grid, 2px strokes, round caps: the same weight as the dock's own icons. */
const PATHS: Record<BaseMenuIcon, ReactNode> = {
  build: <><path d="M4 20h16" /><path d="M6 20V10l6-4 6 4v10" /><path d="M10 20v-5h4v5" /><path d="M12 2v4" /></>,
  mission: <><path d="M12 3c3 2.5 4.5 6 4.5 10l-2 3h-5l-2-3c0-4 1.5-7.5 4.5-10z" /><circle cx="12" cy="10" r="1.6" /><path d="M9.5 16l-2.500 4M14.5 16l2.500 4" /></>,
  market: <><path d="M3 9l1.5-5h15L21 9" /><path d="M3 9a3 3 0 0 0 6 0 3 3 0 0 0 6 0 3 3 0 0 0 6 0" /><path d="M5 12v8h14v-8" /><path d="M10 20v-4h4v4" /></>,
  hangar: <><path d="M3 20V10l9-5 9 5v10" /><path d="M7 20v-7h10v7" /><path d="M7 16h10" /></>,
  station: <><path d="M5 12a7 7 0 0 1 14 0" /><path d="M8 12a4 4 0 0 1 8 0" /><circle cx="12" cy="12" r="1.2" /><path d="M12 13v7M8 20h8" /></>,
  log: <><rect x="5" y="3" width="14" height="18" rx="2" /><path d="M9 8h6M9 12h6M9 16h4" /></>,
  subsurface: <><path d="M3 8h18" /><path d="M7 8v12h10V8" /><path d="M10 12h4M10 16h4" /><path d="M12 3v5" /></>,
  friends: <><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></>,
  research: <><path d="m4 8 9-3 2 6-9 3z" /><path d="m13 6 4-1 2 6-4 1M9 13l-2 8M12 12l4 9M5 21h12M3 16h6" /></>,
  settings: <><circle cx="12" cy="12" r="3" /><path d="M19 12a7 7 0 0 0-.12-1.28l2-1.55-2-3.46-2.47 1A7 7 0 0 0 14.2 5.4L13.8 3h-4l-.4 2.4a7 7 0 0 0-2.21 1.31l-2.47-1-2 3.46 2 1.55A7 7 0 0 0 4.6 12c0 .44.04.87.12 1.28l-2 1.55 2 3.46 2.47-1A7 7 0 0 0 9.4 18.6l.4 2.4h4l.4-2.4a7 7 0 0 0 2.21-1.31l2.47 1 2-3.46-2-1.55A7 7 0 0 0 19 12z" /></>,
}

function MenuIcon({ name }: { name: BaseMenuIcon }): ReactNode {
  return (
    <svg className={styles.icon} viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {PATHS[name]}
    </svg>
  )
}

/** The base's main menu: build, fly and sell first, then the places a player looks things up. */
export function BaseMenuSheet({ items, onClose }: { items: readonly BaseMenuItem[]; onClose: () => void }): ReactNode {
  const primary = items.filter(item => item.primary)
  const rest = items.filter(item => !item.primary)
  const row = (item: BaseMenuItem) => (
    <li key={item.id}>
      <button type="button" className={`${styles.row} ${item.primary ? styles.primary : ''}`} data-testid={`base-menu-${item.id}`} onClick={() => { onClose(); item.onSelect() }}>
        <MenuIcon name={item.icon} />
        <span className={styles.text}>
          <span className={styles.label}>{item.label}</span>
          <span className={styles.detail}>{item.detail}</span>
        </span>
      </button>
    </li>
  )
  return (
    <div className={styles.scrim} data-testid="base-menu" aria-label="Menu" onClick={onClose}>
      <div className={styles.sheet} onClick={event => event.stopPropagation()}>
        <div className={styles.head}>
          <span className={styles.heading}>
            <span className={styles.eyebrow}>Flight operations</span>
            <span className={styles.title}>Command</span>
          </span>
          <button type="button" className={styles.close} data-testid="base-menu-close" aria-label="Close menu" onClick={onClose}><span aria-hidden="true">×</span></button>
        </div>
        <div className={styles.sectionLabel}>Actions</div>
        <ul className={`${styles.list} ${styles.mainList}`}>{primary.map(row)}</ul>
        {rest.length > 0 && <div className={styles.sectionLabel}>Agency and research</div>}
        <ul className={styles.list}>{rest.map(row)}</ul>
      </div>
    </div>
  )
}
