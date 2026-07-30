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
  it('renders live storage totals and keeps habitat training feature-gated', () => {
    const markup = renderToStaticMarkup(
      <HubSubsurfaceView
        stash={{ iron: 12, silicon: 5 }}
        installedParts={{
          engine: 'ion-thruster-t1',
          payload: 'cargo-payload-t1',
        }}
      />,
    )

    expect(markup).toContain('data-testid="hub-subsurface-view"')
    expect(markup).toContain('data-testid="subsurface-facility-cutaway"')
    expect(markup).toContain('Storage &amp; habitat deck')
    expect(markup).toContain('24 M BELOW GRADE')
    expect(markup).toContain('17 mineral units')
    expect(markup).toContain('2 registered parts')
    expect(markup).toContain('data-testid="subsurface-room-mineral-vault"')
    expect(markup).toContain('data-testid="subsurface-room-parts-locker"')
    expect(markup).toContain('data-testid="subsurface-room-habitat-training"')
    expect(markup).toContain('Coming soon')
    expect(markup).toContain('LOCKED')
    expect(markup).not.toContain('Commodity Exchange')
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

  it('opens a storage room and returns to the subsurface deck', async () => {
    const host = document.createElement('div')
    const root = createRoot(host)
    ;(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true

    await act(async () => {
      root.render(<HubSubsurfaceView stash={{ iron: 4 }} />)
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
})
