export type ShortcutAction = 'close-tray' | 'open-market' | 'switch-operation' | null

type ShortcutEvent = Pick<KeyboardEvent, 'key' | 'metaKey' | 'ctrlKey' | 'altKey' | 'defaultPrevented'> & {
  target?: EventTarget | null
}

function isTypingTarget(target: EventTarget | null | undefined) {
  const el = target as HTMLElement | null | undefined
  if (!el || typeof el.tagName !== 'string') return false
  return el.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName)
}

/** Esc closes the open tray, M opens Market, Left/Right are the « » switch. */
export function resolveShortcut(event: ShortcutEvent): ShortcutAction {
  if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey) return null
  if (event.key === 'Escape') return 'close-tray'
  if (isTypingTarget(event.target)) return null
  if (event.key.toLowerCase() === 'm') return 'open-market'
  if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') return 'switch-operation'
  return null
}
