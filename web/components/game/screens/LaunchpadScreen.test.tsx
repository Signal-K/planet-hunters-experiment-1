import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

import LaunchpadScreen from './LaunchpadScreen'
import { STATIC_CATALOG } from '@/lib/catalog'
import { DEFAULT_STATE } from '@/lib/game-state'
import { buildRuntimeCatalog } from '@/lib/runtimeCatalog'

describe('Launchpad own-program actions', () => {
  it('keeps mission resume explicit in the footer', () => {
    const player = {
      ...DEFAULT_STATE.player,
      activeMission: { id: 'baseline-extraction', label: 'Baseline extraction → Eros' },
      missionPhase: 'transit' as const,
    }
    const noop = vi.fn()
    const markup = renderToStaticMarkup(
      <LaunchpadScreen
        onBack={noop}
        onPick={noop}
        onViewContracts={noop}
        onLaunchpadAction={noop}
        onOpenHangar={noop}
        onOpenSubsurface={noop}
        onResumeMission={noop}
        onViewMissionLog={noop}
        missionsDone={player.missionsDone}
        freeOperations={player.freeOperations}
        catalog={STATIC_CATALOG}
        player={player}
      />,
    )

    expect(markup).toContain('data-testid="launchpad-resume-mission-btn"')
    expect(markup).toContain('aria-label="Jump back to active mission"')
    expect(markup).toContain('data-testid="launchpad-mission-log-btn"')
    expect(markup).toContain('MISSION ACTIVE')
  })

  it('exposes self-directed actions once in the command rail', () => {
    const player = {
      ...DEFAULT_STATE.player,
      freeOperations: true,
      missionsDone: 3,
      placed: ['launchpad'],
    }
    const catalog = buildRuntimeCatalog({
      catalog: STATIC_CATALOG,
      freeOperations: true,
      missionsDone: player.missionsDone,
      player,
    })
    const noop = vi.fn()
    const markup = renderToStaticMarkup(
      <LaunchpadScreen
        onBack={noop}
        onPick={noop}
        onViewContracts={noop}
        onLaunchpadAction={noop}
        onOpenHangar={noop}
        onOpenSubsurface={noop}
        missionsDone={player.missionsDone}
        freeOperations={player.freeOperations}
        catalog={catalog}
        player={player}
      />,
    )

    expect(markup).toContain('data-testid="launchpad-create-mission-btn"')
    expect(markup).toContain('CREATE MISSION')
    expect(markup).toContain('data-testid="launchpad-launch-infrastructure-btn"')
    expect(markup).toContain('LAUNCH INFRASTRUCTURE')
    expect(markup).toContain('data-testid="launchpad-guide-open"')
    expect(markup).not.toContain('data-testid="available-actions-panel"')
  })

  it('keeps a legacy Academy unlock out of the active launch loop', () => {
    const player = {
      ...DEFAULT_STATE.player,
      freeOperations: true,
      missionsDone: 3,
      academyResearched: true,
      placed: ['launchpad'],
    }
    const catalog = buildRuntimeCatalog({
      catalog: STATIC_CATALOG,
      freeOperations: true,
      missionsDone: player.missionsDone,
      player,
    })
    const noop = vi.fn()
    const markup = renderToStaticMarkup(
      <LaunchpadScreen
        onBack={noop}
        onPick={noop}
        onViewContracts={noop}
        onLaunchpadAction={noop}
        onOpenHangar={noop}
        onOpenSubsurface={noop}
        missionsDone={player.missionsDone}
        freeOperations={player.freeOperations}
        catalog={catalog}
        player={player}
      />,
    )

    expect(markup).not.toContain('Build Astronaut Academy')
  })
})
