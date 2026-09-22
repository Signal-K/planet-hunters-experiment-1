import { afterEach, describe, expect, it, vi } from 'vitest'
import { triggerHaptic } from './haptics'

describe('triggerHaptic', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('calls navigator.vibrate when available', () => {
    const vibrate = vi.fn()
    vi.stubGlobal('navigator', { vibrate })
    triggerHaptic('press')
    expect(vibrate).toHaveBeenCalledWith(8)
  })

  it('degrades gracefully when vibrate is unavailable', () => {
    vi.stubGlobal('navigator', {})
    expect(() => triggerHaptic('change')).not.toThrow()
  })
})
