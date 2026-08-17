import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { HubWorldBackground } from './HubWorldBackground'

describe('HubWorldBackground', () => {
  it('keeps a DOM terrain fallback when the Pixi terrain is unavailable', () => {
    const markup = renderToStaticMarkup(<HubWorldBackground />)

    expect(markup).toContain('data-testid="hub-terrain-fallback"')
  })
})
