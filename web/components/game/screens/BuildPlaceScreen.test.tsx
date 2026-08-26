import React from 'react'
import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import BuildPlaceScreen from './BuildPlaceScreen'

describe('BuildPlaceScreen', () => {
  it('renders already placed structures in the build scene and removes their plot markers', () => {
    const markup = renderToStaticMarkup(
      <BuildPlaceScreen
        onBack={() => undefined}
        onPlaced={() => undefined}
        player={{
          francs: 10_000,
          placed: ['launchpad'],
          placementPlots: { launchpad: 0 },
          freeOperations: true,
        }}
      />,
    )

    expect(markup).toContain('src="/game/assets/base/launchpad_flat.png"')
    expect(markup).not.toContain('data-testid="build-plot-0"')
  })

  it('does not offer structures that are already built', () => {
    const markup = renderToStaticMarkup(
      <BuildPlaceScreen
        onBack={() => undefined}
        onPlaced={() => undefined}
        player={{
          francs: 10_000,
          placed: ['launchpad'],
          placementPlots: { launchpad: 0 },
          freeOperations: true,
        }}
      />,
    )

    expect(markup).not.toContain('>Launchpad</div>')
    expect(markup).not.toContain('>BUILT</div>')
  })
})
