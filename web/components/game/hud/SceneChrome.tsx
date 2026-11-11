import type { ReactNode } from 'react'
import styles from './SceneChrome.module.css'

/**
 * The one set of controls for full-bleed scenes (pointing, landing, delivery):
 * a dark top row of pills, a glass status card bottom-left, and the cyan action
 * button bottom-right. Scenes compose these; they do not restyle them.
 */

export function SceneTop({ onBack, children, testId }: { onBack: () => void; children?: ReactNode; testId?: string }) {
  return (
    <div className={styles.top}>
      <button type="button" className={styles.back} data-testid={testId} onClick={onBack}>BACK</button>
      {children}
    </div>
  )
}

/** `syncAnchor` puts the sync chip in the row just before this pill, on screens with no francs chip or help button. */
export function ScenePill({ children, align, testId, tone, syncAnchor }: { children: ReactNode; align?: 'end'; testId?: string; tone?: 'cyan' | 'white'; syncAnchor?: boolean }) {
  return <span className={styles.pill} data-align={align} data-tone={tone ?? 'cyan'} data-testid={testId} data-sync-anchor={syncAnchor ? '' : undefined}>{children}</span>
}

export function SceneCard({ children, label, solo }: { children: ReactNode; label: string; solo?: boolean }) {
  return <section className={styles.card} data-solo={solo || undefined} aria-label={label}>{children}</section>
}

export function SceneMeter({ kicker, value, readout, pct, caption, captionValue, testId }: {
  kicker: string; value: string; readout?: string; pct: number; caption: string; captionValue: string; testId?: string
}) {
  return (
    <>
      <div className={styles.row}><span className={styles.kicker}>{kicker}</span><span className={styles.mono}>{value}</span></div>
      <div className={styles.track}><div className={styles.fill} style={{ width: `${pct}%` }} /></div>
      <div className={styles.row} data-muted><span>{caption}</span><strong className={styles.mono} data-testid={testId}>{captionValue}</strong></div>
      {readout && <span className={styles.sr}>{readout}</span>}
    </>
  )
}

export function SceneActions({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={className ? `${styles.actions} ${className}` : styles.actions}>{children}</div>
}

export function ScenePrimary({ children, disabled, onClick, testId }: { children: ReactNode; disabled?: boolean; onClick?: () => void; testId?: string }) {
  return <button type="button" className={styles.primary} data-testid={testId} disabled={disabled} onClick={onClick}>{children}</button>
}

export function SceneGhost({ children, onClick, testId }: { children: ReactNode; onClick?: () => void; testId?: string }) {
  return <button type="button" className={styles.ghost} data-testid={testId} onClick={onClick}>{children}</button>
}

/** Dark edge shading shared by every full-bleed scene. */
export function SceneVignette() {
  return <div className={styles.vignette} aria-hidden="true" />
}

/** A short list inside a card: cargo rows, a fee line, a hold readout. */
export function SceneRows({ children, testId }: { children: ReactNode; testId?: string }) {
  return <div className={styles.rows} data-testid={testId}>{children}</div>
}

export function SceneRow({ label, value, swatch, sub }: { label: string; value: string; swatch?: string; sub?: string }) {
  return (
    <div className={styles.listRow}>
      {swatch && <i className={styles.swatch} style={{ background: swatch }} />}
      <span className={styles.listLabel}>{label}{sub && <small>{sub}</small>}</span>
      <strong>{value}</strong>
    </div>
  )
}

export function SceneNote({ children }: { children: ReactNode }) {
  return <p className={styles.note} role="status">{children}</p>
}

export function SceneMeterHead({ kicker, value }: { kicker: string; value: string }) {
  return <div className={styles.row}><span className={styles.kicker}>{kicker}</span><span className={styles.mono}>{value}</span></div>
}
