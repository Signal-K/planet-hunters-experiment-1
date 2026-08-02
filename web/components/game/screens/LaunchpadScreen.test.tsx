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
  it('puts owned infrastructure first and offers an actionable monitoring build', () => {
    const markup = renderLaunchpad(false)
    expect(markup.indexOf('Owned Infrastructure')).toBeLessThan(markup.indexOf('Launchpad Status'))
    expect(markup).toContain('data-testid="launchpad-build-monitoring-btn"')
    expect(markup).toContain('STATION REQUIRED')
  })

  it('shows the built state without a duplicate build CTA', () => {
    const markup = renderLaunchpad(true)
    expect(markup).toContain('Telemetry and daily instrument downlinks are online.')
    expect(markup).not.toContain('data-testid="launchpad-build-monitoring-btn"')
  })
})
