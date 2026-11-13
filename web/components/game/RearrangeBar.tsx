'use client'

import styles from './RearrangeBar.module.css'

/** SSL-834: the Base row of Build mode. Tap a structure, then move it along the Base or upgrade it; Done leaves Build. */
export default function RearrangeBar({ name, canMove, canLeft, canRight, onLeft, onRight, onUpgrade, onDone }: {
  name: string | null
  canMove: boolean
  canLeft: boolean
  canRight: boolean
  onLeft: () => void
  onRight: () => void
  onUpgrade?: () => void
  onDone: () => void
}) {
  return (
    <div className={styles.bar} data-testid="rearrange-bar" role="group" aria-label="Your base">
      <p className={styles.hint} data-testid="rearrange-hint">{name ? `${name} selected` : 'Tap a structure to move or upgrade it'}</p>
      <div className={styles.row}>
        {name && canMove && <button type="button" className={styles.key} data-testid="rearrange-left" disabled={!canLeft} onClick={onLeft}>‹ Move</button>}
        {name && canMove && <button type="button" className={styles.key} data-testid="rearrange-right" disabled={!canRight} onClick={onRight}>Move ›</button>}
        {name && onUpgrade && <button type="button" className={styles.key} data-testid="rearrange-upgrade" onClick={onUpgrade}>Upgrade</button>}
        <button type="button" className={`${styles.key} ${styles.done}`} data-testid="hub-build-done-btn" onClick={onDone}>Done</button>
      </div>
    </div>
  )
}
