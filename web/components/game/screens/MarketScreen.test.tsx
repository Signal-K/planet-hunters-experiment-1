import React from 'react'
import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import MarketScreen from './MarketScreen'

describe('MarketScreen theme scope', () => {
  it('uses the light editorial theme reserved for market surfaces', () => {
    const markup = renderToStaticMarkup(
      <MarketScreen
        stash={{}}
        francs={120}
        onSell={() => undefined}
        onBack={() => undefined}
        onOpenMissions={() => undefined}
      />,
    )

    expect(markup).toContain('class="theme-light market-screen flex flex-col min-h-screen"')
    expect(markup).toContain('Commodity Exchange')
  })
})
