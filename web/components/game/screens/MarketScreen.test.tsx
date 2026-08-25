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

    expect(markup).toContain('class="theme-light market-screen')
    expect(markup).not.toContain('background:var(--ln-void)')
    expect(markup).toContain('Commodity Exchange')
  })

  it('renders the exchange summary and responsive commodity grid without changing sell behavior', () => {
    const onSell = () => undefined
    const markup = renderToStaticMarkup(
      <MarketScreen
        stash={{ iron: 3, ice: 2 }}
        francs={120}
        onSell={onSell}
        onBack={() => undefined}
        onOpenMissions={() => undefined}
      />,
    )

    expect(markup).toContain('Estimated inventory value')
    expect(markup).toContain('Cargo manifest')
    expect(markup).toContain('data-testid="market-commodity-grid"')
    expect(markup).toContain('Sell All Iron')
    expect(markup).toContain('Sell All Ice')
  })

  it('keeps the empty inventory route actionable', () => {
    const markup = renderToStaticMarkup(
      <MarketScreen
        stash={{}}
        francs={120}
        onSell={() => undefined}
        onBack={() => undefined}
        onOpenMissions={() => undefined}
      />,
    )

    expect(markup).toContain('No cargo to sell yet')
    expect(markup).toContain('Find a Mining Run')
    expect(markup).not.toContain('market-commodity-grid')
  })
})
