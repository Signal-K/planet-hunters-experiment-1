'use client'

import { useMemo, useState, type ReactNode } from 'react'
import { SCREEN_SURFACES, type ScreenSurface } from '@/lib/screen-layouts'
import { UI_ZONES } from '@/lib/ui-zones'
import { FrameSlotContext } from './FrameSlot'
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
 * Slots are filled either by props or from inside the screen with
 * `<FrameSlot name="…">`; an empty slot takes no space.
 */
export default function ScreenFrame({ surface, chrome, top, bottom, overlay, children, className }: ScreenFrameProps) {
  const [topNode, setTopNode] = useState<HTMLElement | null>(null)
  const [bottomNode, setBottomNode] = useState<HTMLElement | null>(null)
  const [overlayNode, setOverlayNode] = useState<HTMLElement | null>(null)
  const nodes = useMemo(() => ({ top: topNode, bottom: bottomNode, overlay: overlayNode }), [topNode, bottomNode, overlayNode])

  return (
    <FrameSlotContext.Provider value={nodes}>
      <div
        className={className ? `${styles.frame} ${className}` : styles.frame}
        data-layout={surface}
        data-chrome={chrome ?? SCREEN_SURFACES[surface].chrome}
      >
        <header ref={setTopNode} className={styles.top} data-frame-slot="top" data-ui-zone={UI_ZONES.topChrome}>{top}</header>
        <div className={styles.main} data-frame-slot="main">{children}</div>
        <nav ref={setBottomNode} className={styles.bottom} data-frame-slot="bottom" data-ui-zone={UI_ZONES.bottomNav}>{bottom}</nav>
        <div ref={setOverlayNode} className={styles.overlay} data-frame-slot="overlay">{overlay}</div>
      </div>
    </FrameSlotContext.Provider>
  )
}
