// @vitest-environment jsdom
import React, { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/components/game/hub/BaseWorldCanvas', () => ({ BaseWorldCanvas: () => <div data-testid="base-world" /> }))
vi.mock('@/components/game/hub/PixelStructure', () => ({ PixelStructure: () => <div data-testid="base-launchpad" /> }))
vi.mock('@/components/game/hub/KitRocket', () => ({ KitRocket: () => <div data-testid="base-rocket" /> }))
vi.mock('@/components/game/SequenceDesktopFrame', () => ({ default: ({ renderStage }: { renderStage: (style: React.CSSProperties) => React.ReactNode }) => <div>{renderStage({})}</div> }))

import { LaunchSequenceCanvas } from './LaunchSequenceCanvas'

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
    vi.clearAllMocks()
  })

  it('starts on the shared base launchpad rather than a separate canvas scene', async () => {
    await act(async () => {
      root = createRoot(container)
      root.render(<LaunchSequenceCanvas rocketName="Explorer" targetName="433 Eros" onComplete={vi.fn()} />)
      await vi.advanceTimersByTimeAsync(0)
    })
    expect(container.querySelector('[data-testid="base-world"]')).not.toBeNull()
    expect(container.querySelector('[data-testid="base-launchpad"]')).not.toBeNull()
  })
})
