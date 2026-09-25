'use client'

import { createContext, useContext, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

export type FrameSlotName = 'top' | 'bottom' | 'overlay'
export type FrameSlotNodes = Record<FrameSlotName, HTMLElement | null>

export const FrameSlotContext = createContext<FrameSlotNodes | null>(null)

/**
 * Fill one of the enclosing ScreenFrame's named slots from inside a screen.
 * The screen keeps its own state (edit mode, subsurface, ...) while its
 * chrome lands in the frame's top bar, bottom bar or overlay layer. Outside
 * a frame (isolated tests, dev previews) the content renders in place.
 */
export function FrameSlot({ name, children }: { name: FrameSlotName; children: ReactNode }) {
  const nodes = useContext(FrameSlotContext)
  if (!nodes) return <>{children}</>
  const node = nodes[name]
  return node ? createPortal(children, node) : null
}
