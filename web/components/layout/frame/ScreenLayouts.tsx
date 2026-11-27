'use client'

import type { ReactNode } from 'react'
import ScreenFrame, { type FrameSurface } from './ScreenFrame'

/** Slots a layout type accepts. Per-type props are added as each type gets
 * its own chrome (SSL-35 follow-up PRs). */
export interface LayoutSlots {
  top?: ReactNode
  bottom?: ReactNode
  overlay?: ReactNode
  children: ReactNode
}

/**
 * Route-driven entry point used by the game shell. It always renders the one
 * `ScreenFrame` element type, so moving between screens of different layout
 * types re-labels the frame instead of remounting the screen tree under it.
 */
export function SurfaceLayout({ surface, ...slots }: LayoutSlots & { surface: FrameSurface }) {
  return <ScreenFrame surface={surface} {...slots} />
}
