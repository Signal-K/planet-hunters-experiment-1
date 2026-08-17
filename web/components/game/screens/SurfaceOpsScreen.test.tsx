// @vitest-environment jsdom
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { DEFAULT_STATE } from '@/lib/game-state'
import type { Player } from '@/lib/game-types'
import SurfaceOpsScreen from './SurfaceOpsScreen'

const noop = () => {}

function render(player: Player) {
  return renderToStaticMarkup(
    <SurfaceOpsScreen
      player={player}
      onBack={noop}
      onPurchaseSiteAccess={noop}
      onBuildLaunchpad={noop}
      onMined={noop}
      onDispatch={noop}
      onRetry={noop}
      onReconcile={noop}
      onAcknowledge={noop}
    />
  )
}

describe('SurfaceOpsScreen', () => {
  it('shows the solo Moon access gate and equipment-locks later sites', () => {
    const markup = render({
      ...DEFAULT_STATE.player,
      freeOperations: true,
      francs: 20_000_000,
    })

    expect(markup).toContain('data-testid="surface-ops-screen"')
    expect(markup).toContain('SOLO · NON-TRANSFERABLE')
    expect(markup).toContain('Open Site')
    expect(markup).toContain('Mars · Arcadia')
    expect(markup).toContain('EQUIPMENT LOCK')
  })

  it('surfaces an operational settlement pad and cargo-ready dispatch', () => {
    const now = Date.now()
    const markup = render({
      ...DEFAULT_STATE.player,
      freeOperations: true,
      francs: 20_000_000,
      surfaceOps: {
        sites: {
          'moon-south-pole': {
            siteAccessPurchasedAt: now - 100_000,
            launchpad: {
              pad: 1,
              startedAt: now - 2_000_000,
              completesAt: now - 1_000,
            },
            storage: { iron: 20 },
          },
        },
      },
    })

    expect(markup).toContain('LAUNCH CONTROL')
    expect(markup).toContain('READY · PAD 2')
    expect(markup).toContain('20/20 U')
    expect(markup).toContain('data-testid="surface-dispatch-ferry"')
  })
})
