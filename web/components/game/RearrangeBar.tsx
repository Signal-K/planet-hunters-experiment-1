'use client'

import styles from './RearrangeBar.module.css'

/** Screen-fixed controls for rearranging the Base: the picked structure's name, move left/right, and done. */
export default function RearrangeBar({ name, canLeft, canRight, onLeft, onRight, onDone }: { name: string | null; canLeft: boolean; canRight: boolean; onLeft: () => void; onRight: () => void; onDone: () => void }) {
  return (
    <div className={styles.bar} data-testid="rearrange-bar" role="group" aria-label="Rearrange the Base">
      <p className={styles.hint} data-testid="rearrange-hint">{name ? `Moving ${name}` : 'Tap a structure to move it'}</p>
      <div className={styles.row}>
        <button type="button" className={styles.key} data-testid="rearrange-left" disabled={!name || !canLeft} onClick={onLeft}>‹ Left</button>
        <button type="button" className={styles.key} data-testid="rearrange-right" disabled={!name || !canRight} onClick={onRight}>Right ›</button>
        <button type="button" className={`${styles.key} ${styles.done}`} data-testid="rearrange-done" onClick={onDone}>Done</button>
      </div>
    </div>
  )
}
