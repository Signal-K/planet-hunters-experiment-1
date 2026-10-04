import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import type { Screen } from '@/lib/game-types'
import { GameChromeBars, mountsSharedChrome } from './GameChromeBars'

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

  it('lists the surfaces that mount the shared bar', () => {
    const screens: Screen[] = [
      'intro', 'build', 'hub', 'hub-subsurface', 'missions', 'galaxy', 'targets', 'fab', 'transit', 'landing',
      'mining', 'delivery', 'debrief', 'refinery', 'market', 'hangar', 'rocket-buy', 'skills', 'rover-mining',
      'launchpad', 'surface-ops', 'academy', 'asteroid-discovery', 'instrument-hub', 'mission-history', 'narrative-ledger',
    ]
    expect(screens.filter(screen => mountsSharedChrome(screen, false))).toEqual(screens.filter(screen => screen !== 'intro'))
    expect(mountsSharedChrome('transit', true)).toBe(false)
  })
})
