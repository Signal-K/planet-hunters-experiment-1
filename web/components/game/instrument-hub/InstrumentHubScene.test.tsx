import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import type { Player } from '@/lib/game-types'
import { InstrumentHubScene } from './InstrumentHubScene'

const player = {
  placed: ['launchpad', 'surface-silo'],
  placementPlots: { launchpad: 1, 'surface-silo': 0 },
  underConstruction: {},
  pendingLaunch: false,
  deepSpaceTelescopeBuilt: true,
} as unknown as Player

describe('InstrumentHubScene', () => {
  it('renders live Earth Base viewport, work surface, and labelled controls', () => {
    const markup = renderToStaticMarkup(
      <InstrumentHubScene
        player={player}
        workSurface={<div data-testid="work-surface">Work</div>}
        controls={<div data-testid="controls-bar">Controls</div>}
      />,
    )

    expect(markup).toContain('data-testid="instrument-hub-scene"')
    expect(markup).toContain('data-testid="instrument-hub-earth-viewport"')
    expect(markup).toContain('data-testid="hub-terrain-fallback"')
    expect(markup).toContain('data-testid="work-surface"')
    expect(markup).toContain('data-testid="controls-bar"')
    expect(markup).not.toContain('plate-k-console')
    expect(markup).not.toContain('plate-j-console')
  })
})
