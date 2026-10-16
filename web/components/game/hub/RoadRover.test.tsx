// @vitest-environment jsdom

import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { RoadRover } from './RoadRover'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const road = {
  id: 'base-road',
  points: [
    { x: 10, groundOffset: 0 },
    { x: 90, groundOffset: 0 },
  ],
}

class ImmediateIntersectionObserver {
  private readonly callback: IntersectionObserverCallback
  constructor(callback: IntersectionObserverCallback) {
    this.callback = callback
  }
  observe(): void {
    this.callback([{ isIntersecting: true } as IntersectionObserverEntry], this as unknown as IntersectionObserver)
  }
  unobserve(): void {}
  disconnect(): void {}
  takeRecords(): IntersectionObserverEntry[] { return [] }
}

describe('RoadRover', () => {
  it('uses the responsive road coordinate and Blender side-on sprite', () => {
    const markup = renderToStaticMarkup(
      <RoadRover
        road={{
          id: 'site-service-road',
          points: [{ x: 12, groundOffset: -7 }, { x: 88, groundOffset: -7 }],
        }}
      />,
    )

    expect(markup).toContain('data-testid="road-rover"')
    expect(markup).toContain('data-road-id="site-service-road"')
    expect(markup).toContain('/game/assets/actors/road_rover.png')
    expect(markup).toContain('left:12%')
    expect(markup).toContain('calc(var(--hub-ground) - 7%)')
  })

  it('does not render without a road path', () => {
    expect(renderToStaticMarkup(<RoadRover />)).toBe('')
  })
})

describe('RoadRover idle motion', () => {
  let container: HTMLDivElement
  let root: Root
  let raf: ReturnType<typeof vi.fn>

  beforeEach(() => {
    raf = vi.fn((cb: FrameRequestCallback) => {
      cb(0)
      return 1
    })
    vi.stubGlobal('requestAnimationFrame', raf)
    vi.stubGlobal('cancelAnimationFrame', vi.fn())
    vi.stubGlobal('IntersectionObserver', ImmediateIntersectionObserver)
    window.matchMedia = vi.fn().mockReturnValue({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
  })

  afterEach(() => {
    act(() => { root.unmount() })
    container.remove()
    document.querySelector('[data-testid="mission-history-tray"]')?.remove()
    vi.unstubAllGlobals()
    vi.useRealTimers()
  })

  it('does not schedule requestAnimationFrame while the road is on screen', () => {
    act(() => { root.render(<RoadRover road={road} />) })
    expect(container.querySelector('[data-testid="road-rover"]')).not.toBeNull()
    expect(raf).not.toHaveBeenCalled()
  })

  it('steps on a timer while visible and holds still under the mission log', async () => {
    vi.useFakeTimers()
    act(() => { root.render(<RoadRover road={road} durationMs={1000} />) })
    const rover = () => container.querySelector<HTMLElement>('[data-testid="road-rover"]')
    act(() => { vi.advanceTimersByTime(500) })
    expect(rover()?.dataset.roadProgress).toBe('0.500')

    const tray = document.createElement('div')
    tray.dataset.testid = 'mission-history-tray'
    document.body.appendChild(tray)
    await act(async () => { await Promise.resolve() })
    const covered = rover()?.dataset.roadProgress
    act(() => { vi.advanceTimersByTime(1000) })
    expect(rover()?.dataset.roadProgress).toBe(covered)
  })
})
