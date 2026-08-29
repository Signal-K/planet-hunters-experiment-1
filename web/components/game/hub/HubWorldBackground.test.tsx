import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { HubWorldBackground } from './HubWorldBackground'

describe('HubWorldBackground', () => {
  it('composes the scene from the modular Blender terrain kit', () => {
    const markup = renderToStaticMarkup(<HubWorldBackground />)

    expect(markup).toContain('data-testid="hub-terrain-fallback"')
    expect(markup).toContain('data-testid="terrain-scene"')
    expect(markup).toContain('/game/assets/terrain/')
  })

  // The painted plate and the hand-written SVG glyphs are the two things
  // KES-260 removed: between them they put three art styles on one screen,
  // which is what made the structures read as pasted on. Neither may come back.
  it('ships no painted backdrop plate and no hand-drawn skyline glyphs', () => {
    const markup = renderToStaticMarkup(<HubWorldBackground />)

    expect(markup).not.toContain('earth_base_exterior')
    expect(markup).not.toContain('data-testid="hub-skyline-fallback"')
    expect(markup).not.toContain('data-testid="hub-mountain-ranges"')
    expect(markup).not.toContain('clip-path:polygon')
  })

  // The whole point of the composition split: the Launchpad close-up must not
  // be the establishing shot at a larger scale.
  it('renders a different composition for the Launchpad close-up', () => {
    const wide = renderToStaticMarkup(<HubWorldBackground composition="earth-base-wide" />)
    const pad = renderToStaticMarkup(<HubWorldBackground composition="earth-base-pad" />)

    expect(wide).toContain('data-composition="earth-base-wide"')
    expect(pad).toContain('data-composition="earth-base-pad"')
    // The wide shot carries the distant sister-facility band; the close-up is
    // near enough that those would be off-frame, and drops them entirely.
    expect(wide).toContain('data-band="facilities-far"')
    expect(pad).not.toContain('data-band="facilities-far"')
    expect(pad).toContain('data-band="facility-apron"')
    expect(pad).toContain('/game/assets/terrain/ground_apron.png')
    expect(pad).toContain('/game/assets/terrain/fence_run.png')
    expect(pad).toContain('data-road-bed="site-service-road"')
    expect(pad).toContain('repeating-linear-gradient')
  })
})
