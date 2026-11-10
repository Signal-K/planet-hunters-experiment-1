import styles from './DataReadyChip.module.css'

/**
 * SSL-801: data waiting at the Data hub stays on screen wherever the Base camera is panned. The sky tag and the
 * station callout sit inside the pannable world and can be off-screen on a phone.
 */
export default function DataReadyChip({ count, onOpen }: { count: number; onOpen: () => void }) {
  if (count <= 0) return null
  return (
    <button
      type="button"
      className={styles.chip}
      data-testid="hub-data-ready-chip"
      aria-label={`${count} ${count === 1 ? 'signal' : 'signals'} ready. Open the Data hub.`}
      onClick={onOpen}
    >
      <i aria-hidden="true" />
      <span>{count} data ready</span>
    </button>
  )
}
