// @vitest-environment jsdom

import React, { act } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { createRoot } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { EarthBaseModules } from './EarthBaseModules'

describe('EarthBaseModules', () => {
  it('keeps the authored structure layer available without a foreground land overlay', () => {
    const markup = renderToStaticMarkup(<EarthBaseModules buildings={[]} />)

    expect(markup).toContain('earth-base-modules-layer')
    expect(markup).not.toContain('facility_deck.png')
  })
})

const silo = {
  kind: 'surface-silo',
  plotX: 154,
  w: 120,
}

function mount(buildStartedAt: number) {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const root = createRoot(container)
  act(() => {
    root.render(<EarthBaseModules buildings={[{ ...silo, buildStartedAt }]} />)
  })
  return {
    container,
    unmount() {
      act(() => {
        root.unmount()
      })
      container.remove()
    },
  }
}

describe('EarthBaseModules surface silo construction', () => {
  afterEach(() => {
    vi.useRealTimers()
    document.body.replaceChildren()
  })

  it('drops the cyan scaffold once the build time elapses and keeps the placed sprite', () => {
    vi.useFakeTimers()
    const view = mount(Date.now())
    expect(view.container.querySelector('.hub-construction-rig')).not.toBeNull()
    expect(view.container.querySelector('img')?.getAttribute('src')).toBe('/game/assets/base/surface_silo_flat.png')

    act(() => {
      vi.advanceTimersByTime(10_000)
    })

    expect(view.container.querySelector('.hub-construction-rig')).toBeNull()
    expect(view.container.querySelector('img')?.getAttribute('src')).toBe('/game/assets/base/surface_silo_flat.png')
    view.unmount()
  })

  it('renders the finished sprite when the build already completed before mount', () => {
    const view = mount(Date.now() - 20_000)
    expect(view.container.querySelector('.hub-construction-rig')).toBeNull()
    expect(view.container.querySelector('img')?.getAttribute('src')).toBe('/game/assets/base/surface_silo_flat.png')
    view.unmount()
  })
})
