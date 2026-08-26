import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { HubWorldBackground } from './HubWorldBackground'

describe('HubWorldBackground', () => {
  it('renders the authored Earth exterior plate, not an unowned abstract backdrop', () => {
    const markup = renderToStaticMarkup(<HubWorldBackground />)

    expect(markup).toContain('data-testid="hub-terrain-fallback"')
    expect(markup).toContain('/game/assets/hub/earth_base_exterior_v1.jpg')
    expect(markup).toContain('data-testid="hub-mountain-ranges"')
    expect(markup).not.toContain('data-testid="hub-orbit-ring"')
    expect(markup).not.toContain('clip-path:polygon')
  })
})
