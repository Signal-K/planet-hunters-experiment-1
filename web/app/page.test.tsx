import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, describe, expect, it, vi } from 'vitest'
import Home from './page'

describe('Landnam landing page', () => {
  afterEach(() => vi.useRealTimers())

  it('links to the Orionids signup flow while the event is active', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-10-22T12:00:00Z'))
    const markup = renderToStaticMarkup(<Home />)
    expect(markup).toContain('data-testid="landing-orionids"')
    expect(markup).toContain('/game?entry=orionids&amp;gate=signup')
  })

  it.each(['2026-10-17T12:00:00Z', '2026-11-08T00:00:00Z'])(
    'omits the Orionids CTA outside the event window on %s',
    (date) => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date(date))
      expect(renderToStaticMarkup(<Home />)).not.toContain('data-testid="landing-orionids"')
    },
  )

  it('lets a visitor see the growing Earth Base before entering operations', () => {
    const markup = renderToStaticMarkup(<Home />)
    expect(markup).toContain('data-testid="landnam-landing"')
    expect(markup).toContain('Base growing from one launchpad')
    expect(markup).toContain('Continue')
    expect(markup).toContain('Start new game')
    expect(markup).toContain('/game')
    expect(markup).not.toContain('redirect')
  })
})
