import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import Home from './page'

describe('Landnam landing page', () => {
  it('lets a visitor see the growing Earth Base before entering operations', () => {
    const markup = renderToStaticMarkup(<Home />)
    expect(markup).toContain('data-testid="landnam-landing"')
    expect(markup).toContain('Earth Base growing from one launchpad')
    expect(markup).toContain('Continue')
    expect(markup).toContain('Start new game')
    expect(markup).toContain('/game')
    expect(markup).not.toContain('redirect')
  })
})
