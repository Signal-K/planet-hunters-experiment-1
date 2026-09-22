import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import Home from './page'

describe('Landnam landing page', () => {
  it('lets a visitor read the program before signing up', () => {
    const markup = renderToStaticMarkup(<Home />)
    expect(markup).toContain('data-testid="landnam-landing"')
    expect(markup).toContain('Enter Operations')
    expect(markup).toContain('/game')
    expect(markup).not.toContain('redirect')
  })
})
