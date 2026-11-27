// @vitest-environment jsdom

import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { EarthBaseModules } from './EarthBaseModules'

describe('EarthBaseModules', () => {
  it('keeps the authored structure layer available without a foreground land overlay', () => {
    const markup = renderToStaticMarkup(<EarthBaseModules buildings={[]} />)

    expect(markup).toContain('earth-base-modules-layer')
    expect(markup).not.toContain('facility_deck.png')
  })
})

describe('EarthBaseModules structures', () => {
  it('draws a placed launchpad at its level, with no construction scaffold', () => {
    const markup = renderToStaticMarkup(<EarthBaseModules buildings={[{ kind: 'launchpad', plotX: 154, w: 120, level: 1 }]} />)
    expect(markup).toContain('data-pixel-structure="launchpad"')
    expect(markup).not.toContain('hub-construction-rig')
  })

  it('draws the starter silo above ground, on its own site', () => {
    const markup = renderToStaticMarkup(<EarthBaseModules buildings={[{ kind: 'surface-silo', plotX: 200, w: 48, level: 1 }]} />)
    expect(markup).toContain('data-pixel-structure="surface-silo"')
    expect(markup).toContain('data-structure="surface-silo"')
  })
})
