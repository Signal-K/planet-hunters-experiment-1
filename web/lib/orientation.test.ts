import { describe, expect, it, vi } from 'vitest'
import { applyOrientation, orientationLockTarget, readOrientation } from './orientation'

describe('readOrientation', () => {
  it('keeps auto, portrait, and landscape', () => {
    expect(readOrientation('auto')).toBe('auto')
    expect(readOrientation('portrait')).toBe('portrait')
    expect(readOrientation('landscape')).toBe('landscape')
  })
  it('falls back to auto for missing or unknown values', () => {
    expect(readOrientation(null)).toBe('auto')
    expect(readOrientation(undefined)).toBe('auto')
    expect(readOrientation('upside-down')).toBe('auto')
  })
})

describe('orientationLockTarget', () => {
  it('locks portrait and landscape and leaves auto unlocked', () => {
    expect(orientationLockTarget('portrait')).toBe('portrait')
    expect(orientationLockTarget('landscape')).toBe('landscape')
    expect(orientationLockTarget('auto')).toBeNull()
  })
})

describe('applyOrientation', () => {
  it('unlocks on auto and locks the chosen side', () => {
    const unlock = vi.fn()
    const lock = vi.fn(() => Promise.resolve())
    applyOrientation('auto', { lock, unlock })
    expect(unlock).toHaveBeenCalledOnce()
    expect(lock).not.toHaveBeenCalled()
    applyOrientation('portrait', { lock, unlock })
    expect(lock).toHaveBeenCalledWith('portrait')
  })
  it('swallows a lock rejection', async () => {
    const lock = vi.fn(() => Promise.reject(new Error('not allowed')))
    applyOrientation('landscape', { lock })
    await Promise.resolve()
    expect(lock).toHaveBeenCalledWith('landscape')
  })
})
