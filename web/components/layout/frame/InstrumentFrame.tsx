import type { ReactNode } from 'react'
import ScreenFrame from './ScreenFrame'
import styles from './InstrumentFrame.module.css'

export default function InstrumentFrame({ header, children }: { header: ReactNode; children: ReactNode }) {
  return <ScreenFrame surface="instrument" chrome="docked" top={<div className={styles.header}>{header}</div>}>
    {children}
  </ScreenFrame>
}
