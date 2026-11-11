'use client'

import styles from './PanHint.module.css'

/** Screen-fixed edge arrows for the pannable Base: each shows only while there is more Base to reach on that side. */
export default function PanHint({ canLeft, canRight, onLeft, onRight }: { canLeft: boolean; canRight: boolean; onLeft: () => void; onRight: () => void }) {
  return (
    <>
      {canLeft && (
        <button type="button" className={`${styles.arrow} ${styles.left}`} data-testid="hub-pan-left" aria-label="Look left along the Base" onClick={onLeft}>
          <span aria-hidden="true">‹</span>
        </button>
      )}
      {canRight && (
        <button type="button" className={`${styles.arrow} ${styles.right}`} data-testid="hub-pan-right" aria-label="Look right along the Base" onClick={onRight}>
          <span aria-hidden="true">›</span>
        </button>
      )}
    </>
  )
}
