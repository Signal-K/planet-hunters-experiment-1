import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { LaunchpadFoundation } from './EarthBaseModules'

describe('LaunchpadFoundation', () => {
  it('uses one Blender-rendered contact deck aligned to the authored plot', () => {
    const markup = renderToStaticMarkup(<LaunchpadFoundation plotX={154} />)

    expect(markup).toContain('data-testid="launchpad-foundation"')
    expect(markup).toContain('/game/assets/terrain/facility_deck.png')
    expect(markup).toContain('bottom:calc(var(--hub-ground) - 2px)')
    expect(markup).toContain('width:min(44%, 520px)')
  })
})
