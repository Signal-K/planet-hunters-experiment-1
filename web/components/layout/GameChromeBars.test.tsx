import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import { GameChromeBars } from './GameChromeBars'

describe('GameChromeBars', () => {
  it('keeps the shared controls mounted for an operational surface', () => {
    const markup = renderToStaticMarkup(
      <GameChromeBars screen="mining" missionsDone={3} hasActiveRun onHome={vi.fn()} onOperations={vi.fn()} onMarket={vi.fn()} onMenu={vi.fn()} />,
    )
    expect(markup).toContain('data-testid="home-ops-readout"')
    expect(markup).toContain('data-testid="home-bottom-bar"')
    expect(markup).toContain('data-testid="home-bar-hub"')
    expect(markup).toContain('data-testid="home-bar-market"')
    expect(markup).toContain('data-testid="settings-button"')
    expect(markup).toContain('« »')
  })
})
