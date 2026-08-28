import React from 'react'
import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import LaunchpadOverviewScreen from './LaunchpadOverviewScreen'
import { STATIC_CATALOG } from '@/lib/catalog'
import { DEFAULT_STATE } from '@/lib/game-state'

describe('LaunchpadOverviewScreen', () => {
  it('renders the full launchpad UI without the close-up scene composition', () => {
    const markup = renderToStaticMarkup(
      <LaunchpadOverviewScreen
        onBack={() => undefined}
        onPick={() => undefined}
        onViewContracts={() => undefined}
        onFocusPad={() => undefined}
        onOpenHangar={() => undefined}
        onOpenSubsurface={() => undefined}
        missionsDone={4}
        freeOperations
        catalog={STATIC_CATALOG}
        player={{ ...DEFAULT_STATE.player, missionsDone: 4, freeOperations: true }}
        francs={DEFAULT_STATE.player.francs}
      />,
    )

    expect(markup).toContain('data-testid="launchpad-ui-screen"')
    expect(markup).toContain('LAUNCHPAD CONTROL')
    expect(markup).toContain('data-testid="launchpad-ui-focus-pad-btn"')
    expect(markup).toContain('data-testid="launchpad-ui-open-hangar-btn"')
    expect(markup).toContain('data-testid="launchpad-ui-open-contracts-btn"')
    expect(markup).not.toContain('launchpad-scene-zoom')
    expect(markup).not.toContain('data-composition="earth-base-pad"')
  })
})
