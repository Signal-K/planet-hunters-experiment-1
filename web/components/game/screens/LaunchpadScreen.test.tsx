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
      onLaunchpadAction={() => undefined}
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
    expect(markup).toContain('/game/assets/base/launchpad_flat.png')
    expect(markup).toContain('/game/assets/base/hangar_flat.png')
    expect(markup).toContain('<button type="button" class="launchpad-scene-object launchpad-tower')
    expect(markup).toContain('START OWN OP')
    expect(markup).not.toContain('pad_hangar')
    expect(markup).not.toContain('pad_complex')
    expect(markup).toContain('ROCKETS')
    expect(markup).toContain('SAT')
    expect(markup).not.toContain('BUILD MONITORING')
  })

  // The reported bug: the close-up rendered the Hub's own establishing shot
  // unchanged, so walking up to the pad left the horizon identical.
  it('composes its own close-up scene rather than reusing the wide shot', () => {
    const markup = renderLaunchpad()
    expect(markup).toContain('data-composition="earth-base-pad"')
    expect(markup).not.toContain('data-composition="earth-base-wide"')
    expect(markup).not.toContain('earth_base_exterior')
  })

  it('keeps M1 focused on contracts', () => {
    const markup = renderLaunchpad(false)
    expect(markup).not.toContain('data-testid="launchpad-guide-open"')
    expect(markup).toContain('data-testid="launchpad-view-contracts-btn"')
    expect(markup).toContain('data-testid="launchpad-open-subsurface-btn"')
  })
})
