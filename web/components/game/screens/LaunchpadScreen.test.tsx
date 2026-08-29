import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

import LaunchpadScreen from './LaunchpadScreen'
import { STATIC_CATALOG } from '@/lib/catalog'
import { DEFAULT_STATE } from '@/lib/game-state'
import { buildRuntimeCatalog } from '@/lib/runtimeCatalog'

describe('Launchpad own-program actions', () => {
  it('exposes self-directed mission creation and infrastructure launch', () => {
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
  })
})
