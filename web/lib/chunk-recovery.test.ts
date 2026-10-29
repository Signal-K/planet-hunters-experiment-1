// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { installChunkRecovery, isStaleChunkError } from './chunk-recovery'

describe('chunk recovery', () => {
  afterEach(() => window.sessionStorage.clear())

  it('recognises stale chunk errors only', () => {
    expect(isStaleChunkError(new Error('No link element found for chunk /_next/static/chunks/a.css'))).toBe(true)
    expect(isStaleChunkError(Object.assign(new Error('x'), { name: 'ChunkLoadError' }))).toBe(true)
    expect(isStaleChunkError(new Error('ROLLOUT_MS is not defined'))).toBe(false)
  })

  it('reloads once, then holds off inside the cooldown', () => {
    const reload = vi.fn()
    const seen = vi.fn()
    const stop = installChunkRecovery(seen, reload)
    const fire = () => window.dispatchEvent(new ErrorEvent('error', {
      error: new Error('No link element found for chunk /_next/static/chunks/a.css'),
    }))
    fire()
    fire()
    expect(reload).toHaveBeenCalledTimes(1)
    expect(seen).toHaveBeenCalledTimes(1)
    stop()
  })

  it('ignores unrelated errors', () => {
    const reload = vi.fn()
    const stop = installChunkRecovery(undefined, reload)
    window.dispatchEvent(new ErrorEvent('error', { error: new Error('boom') }))
    expect(reload).not.toHaveBeenCalled()
    stop()
  })
})
