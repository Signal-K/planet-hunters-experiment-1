import type { ReactNode } from 'react'
import ScreenFrame from './ScreenFrame'

/** Board navigation and utilities share a measured row above the visual workspace. */
export default function BoardFrame({ header, children, actions, overlay }: {
  header: ReactNode
  children: ReactNode
  actions?: ReactNode
  overlay?: ReactNode
}) {
  return <ScreenFrame surface="mission-setup" chrome="docked" top={header} bottom={actions} overlay={overlay}>
    {children}
  </ScreenFrame>
}
