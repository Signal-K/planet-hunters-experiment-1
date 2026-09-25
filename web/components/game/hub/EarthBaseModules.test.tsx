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
