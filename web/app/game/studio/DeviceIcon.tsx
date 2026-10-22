import type { ViewportKey } from '@/lib/authoring/studio-model'
import styles from './Studio.module.css'

/** A phone upright, a phone on its side, or a screen on a stand: the three device sizes of the stage. */
export default function DeviceIcon({ k }: { k: ViewportKey }) {
  return (
    <svg className={styles.segIcon} width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {k === 'ph' && <><rect x="4.5" y="1.5" width="7" height="13" rx="1.8" /><path d="M7 12.4h2" /></>}
      {k === 'ls' && <><rect x="1.5" y="4.5" width="13" height="7" rx="1.8" /><path d="M12.4 7v2" /></>}
      {k === 'dk' && <><rect x="1.5" y="2.5" width="13" height="8.5" rx="1.4" /><path d="M5.5 14h5M8 11v3" /></>}
    </svg>
  )
}
