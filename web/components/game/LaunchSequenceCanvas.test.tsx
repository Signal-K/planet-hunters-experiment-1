// @vitest-environment jsdom
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { LAUNCH_COMPLETE_MS, LaunchSequenceCanvas } from './LaunchSequenceCanvas'

;(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

describe('LaunchSequenceCanvas', () => {
  let container: HTMLDivElement
  let root: Root

  beforeEach(() => {
    vi.useFakeTimers()
    container = document.createElement('div')
    document.body.appendChild(container)
  })

  afterEach(() => {
    act(() => root.unmount())
    container.remove()
    vi.useRealTimers()
  })

  it('draws no pad, rocket or sky of its own: the launch plays on the launchpad underneath', async () => {
    const done = vi.fn()
    await act(async () => {
      root = createRoot(container)
      root.render(<LaunchSequenceCanvas rocketName="Explorer" targetName="433 Eros" onComplete={done} />)
      await vi.advanceTimersByTimeAsync(0)
    })
    expect(container.querySelector('img, canvas')).toBeNull()
    expect(container.textContent).toContain('433 Eros')
    expect(container.querySelector('[data-phase="countdown"]')).not.toBeNull()
    await act(async () => { await vi.advanceTimersByTimeAsync(2_500) })
    expect(container.querySelector('[data-phase="ascent"]')).not.toBeNull()
    expect(Number((container.querySelector('[data-testid="launch-fade"]') as HTMLElement).style.opacity)).toBe(0)
    expect(done).not.toHaveBeenCalled()
    await act(async () => { await vi.advanceTimersByTimeAsync(LAUNCH_COMPLETE_MS) })
    expect(done).toHaveBeenCalledTimes(1)
  })
})
