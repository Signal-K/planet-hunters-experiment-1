// @vitest-environment jsdom

import React from 'react'
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import {
  HubSubsurfaceView,
  registeredParts,
  storedMinerals,
} from './HubSubsurfaceView'

describe('HubSubsurfaceView', () => {
  it('renders an unexcavated empty deck by default, not the finished facility', () => {
    const markup = renderToStaticMarkup(
      <HubSubsurfaceView stash={{ iron: 12 }} francs={10_000_000} />,
    )

    expect(markup).toContain('data-testid="hub-subsurface-view"')
    expect(markup).toContain('data-testid="subsurface-surface-continuation"')
    expect(markup).toContain('Unexcavated')
    expect(markup).toContain('data-testid="subsurface-excavate-prompt"')
    expect(markup).toContain('data-testid="subsurface-excavate-cta"')
    expect(markup).toContain('surface plot')
    expect(markup).not.toContain('data-testid="subsurface-facility-cutaway"')
    expect(markup).not.toContain('Commodity Exchange')
  })

  it('renders the facility cutaway once excavated, with unbuilt rooms locked behind a build cost', () => {
    const markup = renderToStaticMarkup(
      <HubSubsurfaceView
        stash={{ iron: 12, silicon: 5 }}
        installedParts={{
          engine: 'ion-thruster-t1',
          payload: 'cargo-payload-t1',
        }}
        francs={10_000_000}
        subsurfaceExcavated
      />,
    )

    expect(markup).toContain('data-testid="subsurface-facility-cutaway"')
    expect(markup).toContain('Storage &amp; habitat deck')
    expect(markup).toContain('data-testid="subsurface-room-mineral-vault"')
    expect(markup).toContain('data-testid="subsurface-room-parts-locker"')
    expect(markup).toContain('data-testid="subsurface-room-habitat-training"')
    expect(markup).toContain('Unbuilt')
    expect(markup).toContain('Coming soon')
    expect(markup).toContain('LOCKED')
    expect(markup).not.toContain('Commodity Exchange')
  })

  it('shows live inventory only for rooms that have actually been built', () => {
    const markup = renderToStaticMarkup(
      <HubSubsurfaceView
        stash={{ iron: 12 }}
        francs={10_000_000}
        subsurfaceExcavated
        subsurfaceBuilt={['mineral-vault']}
      />,
    )
    expect(markup).toContain('12 mineral units')
    expect(markup).toContain('Online')
  })

  it('sorts positive mineral inventory by stored amount', () => {
    expect(storedMinerals({ silicon: 2, iron: 7, carbon: 0 }).map(row => row.id))
      .toEqual(['iron', 'silicon'])
  })

  it('resolves registered part ids to the canonical hardware catalog', () => {
    expect(registeredParts({
      payload: 'cargo-payload-t1',
      engine: 'ion-thruster-t1',
    })).toEqual([
      { id: 'ion-thruster-t1', name: 'Ion Thruster T1', kind: 'engine' },
      { id: 'cargo-payload-t1', name: 'Cargo Bay T1', kind: 'payload' },
    ])
  })

  it('opens a built storage room and returns to the subsurface deck', async () => {
    const host = document.createElement('div')
    const root = createRoot(host)
    ;(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true

    await act(async () => {
      root.render(
        <HubSubsurfaceView
          stash={{ iron: 4 }}
          francs={10_000_000}
          subsurfaceExcavated
          subsurfaceBuilt={['mineral-vault']}
        />,
      )
    })

    const room = host.querySelector<HTMLButtonElement>('[data-testid="subsurface-room-mineral-vault"]')
    expect(room).not.toBeNull()
    await act(async () => {
      room?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
    expect(host.querySelector('[data-testid="subsurface-mineral-vault"]')).not.toBeNull()
    expect(host.textContent).toContain('4 U')

    const back = host.querySelector<HTMLButtonElement>('[data-testid="subsurface-room-back"]')
    await act(async () => {
      back?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
    expect(host.querySelector('[data-testid="subsurface-mineral-vault"]')).toBeNull()
    expect(host.querySelector('[data-testid="subsurface-room-mineral-vault"]')).not.toBeNull()

    await act(async () => {
      root.unmount()
    })
  })

  it('excavating the deck calls onExcavate', async () => {
    const host = document.createElement('div')
    const root = createRoot(host)
    ;(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true
    let excavated = false

    await act(async () => {
      root.render(
        <HubSubsurfaceView
          francs={10_000_000}
          stash={{ aluminium: 50 }}
          onExcavate={() => { excavated = true }}
        />,
      )
    })

    const cta = host.querySelector<HTMLButtonElement>('[data-testid="subsurface-excavate-cta"]')
    expect(cta).not.toBeNull()
    await act(async () => {
      cta?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
    expect(excavated).toBe(true)

    await act(async () => {
      root.unmount()
    })
  })

  it('building an unbuilt room calls onBuildRoom with the room id', async () => {
    const host = document.createElement('div')
    const root = createRoot(host)
    ;(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true
    let built: string | null = null

    await act(async () => {
      root.render(
        <HubSubsurfaceView
          francs={10_000_000}
          stash={{ aluminium: 50, copper: 50 }}
          subsurfaceExcavated
          onBuildRoom={roomId => { built = roomId }}
        />,
      )
    })

    const room = host.querySelector<HTMLButtonElement>('[data-testid="subsurface-room-mineral-vault"]')
    await act(async () => {
      room?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
    const buildBtn = host.querySelector<HTMLButtonElement>('[data-testid="subsurface-build-mineral-vault"]')
    expect(buildBtn).not.toBeNull()
    await act(async () => {
      buildBtn?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
    expect(built).toBe('mineral-vault')

    await act(async () => {
      root.unmount()
    })
  })
})
