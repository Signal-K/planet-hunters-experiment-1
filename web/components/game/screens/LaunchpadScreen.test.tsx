import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

import LaunchpadScreen from './LaunchpadScreen'
import { STATIC_CATALOG } from '@/lib/catalog'
import { DEFAULT_STATE } from '@/lib/game-state'
import { buildRuntimeCatalog } from '@/lib/runtimeCatalog'

describe('Launchpad own-program actions', () => {
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
    expect(markup).not.toContain('data-testid="available-actions-panel"')
    expect(markup).not.toContain('data-testid="launchpad-guide"')
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
