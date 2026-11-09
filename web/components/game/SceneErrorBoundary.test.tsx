// @vitest-environment jsdom
import React, { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import SceneErrorBoundary from './SceneErrorBoundary'

;(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

vi.mock('@/lib/posthog', () => ({ captureGameEvent: vi.fn() }))

function Boom(): React.ReactElement {
  throw new Error('mining resume exploded')
}

function fakeGame(overrides: Record<string, unknown> = {}) {
  return {
    screen: 'mining',
    missionId: 'm1',
    targetId: 'eros',
    mission: undefined,
    target: undefined,
    deliveryTargetId: null,
    player: { activeMission: { id: 'm1', label: 'Iron -> Eros' }, missionPhase: 'mining' },
    go: vi.fn(),
    abandonMission: vi.fn(),
    ...overrides,
  } as never
}

describe('SceneErrorBoundary', () => {
  let container: HTMLDivElement
  let root: Root

  beforeEach(() => {
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    act(() => root.unmount())
    container.remove()
    vi.restoreAllMocks()
  })

  it('shows the real error and the run, with a way out, instead of a blank page', () => {
    const game = fakeGame()
    act(() => root.render(<SceneErrorBoundary game={game} resetKey="mining"><Boom /></SceneErrorBoundary>))

    const text = container.textContent ?? ''
    expect(text).toContain('THIS SCENE CRASHED')
    expect(text).toContain('mining resume exploded')
    expect(text).toContain('runLabel: Iron -> Eros')
    expect(text).toContain('DISCARD THIS RUN')

    const buttons = [...container.querySelectorAll('button')]
    act(() => buttons.find(b => b.textContent === 'BACK TO BASE')!.click())
    expect((game as unknown as { go: ReturnType<typeof vi.fn> }).go).toHaveBeenCalledWith('hub')
    act(() => buttons.find(b => b.textContent === 'DISCARD THIS RUN')!.click())
    expect((game as unknown as { abandonMission: ReturnType<typeof vi.fn> }).abandonMission)
      .toHaveBeenCalledWith({ confirmed: true, waivePenalty: true })
  })

  it('renders the game again once the screen changes', () => {
    const game = fakeGame()
    act(() => root.render(<SceneErrorBoundary game={game} resetKey="mining"><Boom /></SceneErrorBoundary>))
    expect(container.textContent).toContain('THIS SCENE CRASHED')

    act(() => root.render(<SceneErrorBoundary game={game} resetKey="hub"><p>the hub</p></SceneErrorBoundary>))
    expect(container.textContent).toBe('the hub')
  })
})
