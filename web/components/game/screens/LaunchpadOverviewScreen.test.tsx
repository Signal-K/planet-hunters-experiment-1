import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

import LaunchpadOverviewScreen from './LaunchpadOverviewScreen'
import { STATIC_CATALOG } from '@/lib/catalog'
import { DEFAULT_STATE } from '@/lib/game-state'

describe('Launchpad overview commands', () => {
  it('keeps an active mission resumable and exposes the program footer', () => {
    const player = {
      ...DEFAULT_STATE.player,
      activeMission: { id: 'baseline-extraction', label: 'Baseline extraction → Eros' },
      missionPhase: 'transit' as const,
    }
    const noop = vi.fn()
    const markup = renderToStaticMarkup(
      <LaunchpadOverviewScreen
        onBack={noop}
        onPick={noop}
        onViewContracts={noop}
        onFocusPad={noop}
        onOpenHangar={noop}
        onOpenBuild={noop}
        onResumeMission={noop}
        onViewMissionLog={noop}
        missionsDone={player.missionsDone}
        freeOperations={player.freeOperations}
        catalog={STATIC_CATALOG}
        player={player}
      />,
    )

    expect(markup).toContain('data-testid="launchpad-ui-resume-mission-btn"')
    expect(markup).not.toContain('START OPERATION')
    expect(markup).toContain('data-testid="launchpad-ui-footer-focus-pad-btn"')
    expect(markup).toContain('data-testid="launchpad-ui-footer-hangar-btn"')
    expect(markup).toContain('data-testid="launchpad-ui-footer-mission-log-btn"')
    expect(markup).not.toContain('data-testid="launchpad-ui-footer-subsurface-btn"')
    expect(markup).toContain('data-testid="launchpad-ui-footer-contracts-btn"')
  })
})
