'use client'

import type { ReactNode } from 'react'
import { SCREEN_SURFACES, type ScreenSurface } from '@/lib/screen-layouts'
import { UI_ZONES } from '@/lib/ui-zones'
import styles from './ScreenFrame.module.css'

export type FrameSurface = Exclude<ScreenSurface, 'dev'>

export interface ScreenFrameProps {
  surface: FrameSurface
  /** Overrides the surface's default chrome mode. */
  chrome?: 'floating' | 'docked'
  top?: ReactNode
  bottom?: ReactNode
  overlay?: ReactNode
  children: ReactNode
  className?: string
}

/**
 * The shared screen frame (SSL-35). Every game screen renders inside exactly
 * one of these, via the layout type its route maps to in `GAME_ROUTES`.
 */
export default function ScreenFrame({ surface, chrome, top, bottom, overlay, children, className }: ScreenFrameProps) {
  return (
    <div
      className={className ? `${styles.frame} ${className}` : styles.frame}
      data-layout={surface}
      data-chrome={chrome ?? SCREEN_SURFACES[surface].chrome}
    >
      {top != null && <header className={styles.top} data-frame-slot="top" data-ui-zone={UI_ZONES.topChrome}>{top}</header>}
      <div className={styles.main} data-frame-slot="main">{children}</div>
      {bottom != null && <nav className={styles.bottom} data-frame-slot="bottom" data-ui-zone={UI_ZONES.bottomNav}>{bottom}</nav>}
      {overlay != null && <div className={styles.overlay} data-frame-slot="overlay">{overlay}</div>}
    </div>
  )
}
