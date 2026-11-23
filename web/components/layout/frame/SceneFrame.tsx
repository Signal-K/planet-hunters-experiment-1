import type { ReactNode } from 'react'
import ScreenFrame from './ScreenFrame'
import styles from './SceneFrame.module.css'

/** Travel and surface scenes share measured navigation and operation rows around the world. */
export default function SceneFrame({ surface, header, status, actions, overlay, children }: {
  surface: 'orbit' | 'takeon'
  header: ReactNode
  status?: ReactNode
  actions?: ReactNode
  overlay?: ReactNode
  children: ReactNode
}) {
  return <ScreenFrame surface={surface} chrome="docked"
    top={<div className={styles.header}>{header}</div>}
    bottom={status || actions ? <div className={styles.operations}>{status}{actions}</div> : undefined}
    overlay={overlay}>
    {children}
  </ScreenFrame>
}
