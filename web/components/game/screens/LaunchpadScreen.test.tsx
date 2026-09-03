// @vitest-environment jsdom

import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
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

  it('exposes one new-mission command once in the command rail', () => {
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

    expect(markup).toContain('data-testid="launchpad-new-mission-btn"')
    expect(markup).toContain('NEW MISSION')
    expect(markup).not.toContain('data-testid="launchpad-create-mission-btn"')
    expect(markup).not.toContain('data-testid="launchpad-launch-infrastructure-btn"')
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

  it('opens the three own-program mission choices when the pad is clicked', async () => {
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
    const host = document.createElement('div')
    const root = createRoot(host)
    const onPick = vi.fn()
    ;(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true

    await act(async () => {
      root.render(
        <LaunchpadScreen
          onBack={vi.fn()}
          onPick={onPick}
          onViewContracts={vi.fn()}
          onLaunchpadAction={vi.fn()}
          onOpenHangar={vi.fn()}
          onOpenSubsurface={vi.fn()}
          missionsDone={player.missionsDone}
          freeOperations={player.freeOperations}
          catalog={catalog}
          player={player}
        />,
      )
    })

    await act(async () => {
      host.querySelector<HTMLButtonElement>('[data-testid="launchpad-status-card"]')?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    expect(host.querySelector('[data-testid="launchpad-new-mission-menu"]')).not.toBeNull()
    expect(host.querySelector('[data-testid="launchpad-new-mission-satellite-btn"]')).not.toBeNull()
    expect(host.querySelector('[data-testid="launchpad-new-mission-mining-btn"]')).not.toBeNull()
    expect(host.querySelector('[data-testid="launchpad-new-mission-build-btn"]')).not.toBeNull()
    expect(host.textContent).toContain('LAUNCH SATELLITE / TOOL')
    expect(host.textContent).toContain('GO MINING')
    expect(host.textContent).toContain('BUILD SOMETHING YOURSELF')
    expect(host.textContent).toContain('Client contracts remain on the Mission Board.')

    await act(async () => {
      host.querySelector<HTMLButtonElement>('[data-testid="launchpad-new-mission-mining-btn"]')?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    expect(onPick).toHaveBeenCalledWith('freeops-self-directed-mining')
    await act(async () => root.unmount())
  })
})
