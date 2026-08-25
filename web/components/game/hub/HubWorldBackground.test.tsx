import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { HubWorldBackground } from './HubWorldBackground'

describe('HubWorldBackground', () => {
  it('renders the Earth-diorama skyline silhouette, not a space object', () => {
    const markup = renderToStaticMarkup(<HubWorldBackground />)

    expect(markup).toContain('data-testid="hub-skyline-fallback"')
    expect(markup).toContain('data-testid="hub-mountain-ranges"')
    expect(markup).not.toContain('data-testid="hub-orbit-ring"')
    expect(markup).not.toContain('clip-path:polygon')
  })
})
