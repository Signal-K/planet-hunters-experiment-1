import type { ReactNode } from 'react'
import styles from './Omega.module.css'

/** Shared information furniture for game pages; presentation only. */
export function OmegaPanel({ title, meta, children, className = '' }: { title?: string; meta?: string; children: ReactNode; className?: string }) {
  return <section className={`${styles.panel} ${title ? styles.titled : ''} ${className}`}><>{title && <span className={styles.tab}>{title}</span>}{meta && <span className={styles.meta}>{meta}</span>}</>{children}</section>
}

export function StatStrip({ label, children }: { label: string; children: ReactNode }) { return <div className={styles.strip} role="group" aria-label={label}>{children}</div> }
export function Stat({ label, value, detail }: { label: string; value: string | number; detail?: string }) { return <div className={styles.stat}><span>{label}</span><strong>{value}</strong>{detail && <small>{detail}</small>}</div> }
export function meterFraction(value: number, max: number) { return Number.isFinite(value) && Number.isFinite(max) && max > 0 ? Math.min(1, Math.max(0, value / max)) : 0 }
