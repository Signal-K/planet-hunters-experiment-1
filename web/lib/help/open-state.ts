'use client'

import { useSyncExternalStore } from 'react'

/**
 * Whether any help sheet or "Show me" run is open. The Flight Plan beacon and
 * its 8s hint timer read this so they pause while the player is reading help.
 * Counted so two overlapping owners cannot unpause each other.
 */
let openCount = 0
const listeners = new Set<() => void>()

function emit() {
  if (typeof document !== 'undefined') {
    if (openCount > 0) document.documentElement.setAttribute('data-help-open', 'true')
    else document.documentElement.removeAttribute('data-help-open')
  }
  listeners.forEach(listener => listener())
}

export function acquireHelpOpen(): () => void {
  let released = false
  openCount += 1
  emit()
  return () => {
    if (released) return
    released = true
    openCount = Math.max(0, openCount - 1)
    emit()
  }
}

export function isHelpOpen(): boolean {
  return openCount > 0
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => { listeners.delete(listener) }
}

export function useHelpOpen(): boolean {
  return useSyncExternalStore(subscribe, isHelpOpen, () => false)
}
