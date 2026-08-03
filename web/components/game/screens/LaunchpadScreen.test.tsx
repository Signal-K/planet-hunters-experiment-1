import React from 'react'
import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import LaunchpadScreen from './LaunchpadScreen'
import { STATIC_CATALOG } from '@/lib/catalog'
import { DEFAULT_STATE } from '@/lib/game-state'

function renderLaunchpad(satelliteMonitoringBuilt: boolean): string {
  return renderToStaticMarkup(
    <LaunchpadScreen
      onBack={() => undefined}
      onPick={() => undefined}
      onViewContracts={() => undefined}
      onOpenHangar={() => undefined}
      onBuildMonitoring={() => undefined}
      missionsDone={4}
      freeOperations
      catalog={STATIC_CATALOG}
      player={{ ...DEFAULT_STATE.player, missionsDone: 4, freeOperations: true, satelliteMonitoringBuilt }}
      francs={DEFAULT_STATE.player.francs}
    />
  )
}

describe('LaunchpadScreen infrastructure hierarchy', () => {
  it('renders owned infrastructure as a visual scene with an actionable monitoring build', () => {
    const markup = renderLaunchpad(false)
    expect(markup).toContain('data-testid="launchpad-monitoring-structure"')
    expect(markup).toContain('data-testid="launchpad-satellite-orbit"')
    expect(markup).toContain('data-testid="launchpad-rocket-fleet"')
    expect(markup).toContain('data-testid="launchpad-build-monitoring-btn"')
    expect(markup).toContain('data-testid="launchpad-guide-open"')
    expect(markup).toContain('BUILD MONITORING STATION')
    expect(markup).toContain('class="game-screen theme-deep ln-scene-launchpad"')
    expect(markup).not.toContain('launchpad-command-grid')
    expect(markup).not.toMatch(/<p(?:\s|>)/)
  })

  it('shows the built state without a duplicate build CTA', () => {
    const markup = renderLaunchpad(true)
    expect(markup).toContain('S.M.S. · ONLINE')
    expect(markup).not.toContain('data-testid="launchpad-build-monitoring-btn"')
  })
})
