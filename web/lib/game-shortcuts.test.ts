import { describe, expect, it } from 'vitest'
import { resolveShortcut } from './game-shortcuts'

const key = (k: string, extra: object = {}) => ({ key: k, metaKey: false, ctrlKey: false, altKey: false, defaultPrevented: false, ...extra })

describe('resolveShortcut', () => {
  it('maps Esc to closing the open tray', () => {
    expect(resolveShortcut(key('Escape'))).toBe('close-tray')
  })
  it('maps M to Market and arrows to the « » switch', () => {
    expect(resolveShortcut(key('m'))).toBe('open-market')
    expect(resolveShortcut(key('ArrowLeft'))).toBe('switch-operation')
    expect(resolveShortcut(key('ArrowRight'))).toBe('switch-operation')
  })
  it('ignores letter and arrow keys while typing, but still honours Esc', () => {
    const target = { tagName: 'INPUT', isContentEditable: false } as unknown as EventTarget
    expect(resolveShortcut(key('m', { target }))).toBeNull()
    expect(resolveShortcut(key('ArrowLeft', { target }))).toBeNull()
    expect(resolveShortcut(key('Escape', { target }))).toBe('close-tray')
  })
  it('ignores modified keys', () => {
    expect(resolveShortcut(key('m', { metaKey: true }))).toBeNull()
  })
})
