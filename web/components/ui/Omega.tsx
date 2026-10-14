import type { ReactNode } from 'react'
import styles from './Omega.module.css'

/**
 * Out There: Omega page furniture for internal pages: layered panels with a title tab, stat tiles and meters.
 * Presentation only; it adds no behavior and no colours beyond the blueprint tokens.
 */
export type OmegaTone = 'default' | 'ok' | 'info'

interface OmegaPanelProps {
  /** Ink title tab above the panel's top-left corner. */
  title?: string
  /** Paper tab above the top-right corner (a count, status or reward). */
  meta?: string
  tone?: OmegaTone
  className?: string
  testId?: string
  children: ReactNode
}

export function OmegaPanel({ title, meta, tone = 'default', className, testId, children }: OmegaPanelProps) {
  const classes = [
    styles.panel,
    (title || meta) && styles.titled,
    tone === 'ok' && styles.toneOk,
    tone === 'info' && styles.toneInfo,
    className,
  ].filter(Boolean).join(' ')
  return (
    <section className={classes} data-testid={testId}>
      {title && <span className={styles.tab}>{title}</span>}
      {meta && <span className={styles.tabMeta}>{meta}</span>}
      {children}
    </section>
  )
}

export function StatStrip({ children, label, testId }: { children: ReactNode; label?: string; testId?: string }) {
  return <div className={styles.strip} role="group" aria-label={label} data-testid={testId}>{children}</div>
}

interface StatProps {
  label: string
  value: string | number
  sub?: string
  tone?: OmegaTone
}

export function Stat({ label, value, sub, tone = 'default' }: StatProps) {
  const classes = [styles.stat, tone === 'ok' && styles.statOk, tone === 'info' && styles.statInfo].filter(Boolean).join(' ')
  return (
    <div className={classes}>
      <span className={styles.statLabel}>{label}</span>
      <span className={styles.statValue}>{value}</span>
      {sub && <span className={styles.statSub}>{sub}</span>}
    </div>
  )
}

interface MeterRowProps {
  label: string
  value: number
  max: number
  /** Right-hand readout; defaults to `value / max`. */
  text?: string
  tone?: OmegaTone
}

/** Share of `max` that `value` fills, clamped to 0..1 (an empty or negative max reads as empty). */
export function meterFraction(value: number, max: number): number {
  if (!Number.isFinite(value) || !Number.isFinite(max) || max <= 0) return 0
  return Math.min(1, Math.max(0, value / max))
}

export function MeterRow({ label, value, max, text, tone = 'default' }: MeterRowProps) {
  const fraction = meterFraction(value, max)
  return (
    <div className={styles.meter}>
      <div className={styles.meterHead}>
        <span>{label}</span>
        <span className={styles.meterText}>{text ?? `${value} / ${max}`}</span>
      </div>
      <div className={styles.track} role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={max} aria-valuenow={Math.min(value, max)}>
        <div className={`${styles.fill} ${tone === 'ok' ? styles.fillOk : ''}`} style={{ width: `${Math.round(fraction * 100)}%` }} />
      </div>
    </div>
  )
}
