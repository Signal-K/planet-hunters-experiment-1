import React from 'react'
import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import LaunchpadScreen from './LaunchpadScreen'
import { STATIC_CATALOG } from '@/lib/catalog'
import { DEFAULT_STATE } from '@/lib/game-state'

function renderLaunchpad(freeOperations = true): string {
  return renderToStaticMarkup(
    <LaunchpadScreen
      onBack={() => undefined}
      onPick={() => undefined}
      onViewContracts={() => undefined}
      onOpenHangar={() => undefined}
      onOpenSubsurface={() => undefined}
      missionsDone={freeOperations ? 4 : 0}
      freeOperations={freeOperations}
      catalog={STATIC_CATALOG}
      player={{ ...DEFAULT_STATE.player, missionsDone: freeOperations ? 4 : 0, freeOperations }}
      francs={DEFAULT_STATE.player.francs}
    />
  )
}

describe('LaunchpadScreen', () => {
  it('keeps the launchpad focused on vehicles and contracts', () => {
    const markup = renderLaunchpad()
    expect(markup).toContain('data-testid="launchpad-rocket-fleet"')
    expect(markup).toContain('data-testid="launchpad-guide-open"')
    expect(markup).toContain('data-testid="launchpad-view-contracts-btn"')
    expect(markup).toContain('data-testid="launchpad-open-subsurface-btn"')
    expect(markup).toContain('/game/assets/hub/pad_complex_v3.png')
    expect(markup).toContain('/game/assets/hub/pad_hangar_v3.png')
    expect(markup).not.toContain('/game/assets/hub/pad_hangar.png')
    expect(markup).toContain('ROCKETS')
    expect(markup).toContain('SAT')
    expect(markup).not.toContain('BUILD MONITORING')
  })

  it('keeps M1 focused on contracts', () => {
    const markup = renderLaunchpad(false)
    expect(markup).not.toContain('data-testid="launchpad-guide-open"')
    expect(markup).toContain('data-testid="launchpad-view-contracts-btn"')
    expect(markup).toContain('data-testid="launchpad-open-subsurface-btn"')
  })
})
