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
      freeOperations: true,
      missionsDone: 3,
    }
    const noop = vi.fn()
    const markup = renderToStaticMarkup(
      <LaunchpadScreen
        onBack={noop}
        onPick={noop}
        onViewContracts={noop}
        onLaunchpadAction={noop}
        onOpenHangar={noop}
        onResumeMission={noop}
        onViewMissionLog={noop}
        missionsDone={player.missionsDone}
        freeOperations={player.freeOperations}
        catalog={STATIC_CATALOG}
        player={player}
      />,
    )

    expect(markup).toContain('data-testid="launchpad-resume-mission-btn"')
    expect(markup).toContain('data-testid="launchpad-active-mission-callout"')
    expect(markup).toContain('DISMISS')
    expect(markup).toContain('aria-label="Jump back to active mission"')
    expect(markup).toContain('data-testid="launchpad-mission-log-btn"')
    expect(markup).toContain('data-testid="launchpad-primary-mission-btn"')
    expect(markup).toContain('NEW MISSION')
  })

  it('shows a focused resource run as a fifth, preconfigured operation', () => {
    const player = {
      ...DEFAULT_STATE.player,
      freeOperations: true,
      missionsDone: 3,
      resourceFocus: { label: 'Mineral Vault', minerals: { aluminium: 15 } },
    }
    const catalog = buildRuntimeCatalog({ catalog: STATIC_CATALOG, freeOperations: true, missionsDone: 3, player })
    const markup = renderToStaticMarkup(
      <LaunchpadScreen onBack={vi.fn()} onPick={vi.fn()} onViewContracts={vi.fn()} onLaunchpadAction={vi.fn()} onOpenHangar={vi.fn()} missionsDone={3} freeOperations catalog={catalog} player={player} missionMenuOpen />,
    )
    expect(markup).toContain('data-testid="launchpad-new-mission-resource-focus-btn"')
    expect(markup).toContain('RESOURCE FOCUS')
    expect(markup).toContain('Materials for Mineral Vault')
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
        missionsDone={player.missionsDone}
        freeOperations={player.freeOperations}
        catalog={catalog}
        player={player}
      />,
    )

    expect(markup).toContain('data-testid="launchpad-new-mission-btn"')
    expect(markup).toContain('data-testid="launchpad-primary-mission-btn"')
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
        missionsDone={player.missionsDone}
        freeOperations={player.freeOperations}
        catalog={catalog}
        player={player}
      />,
    )

    expect(markup).not.toContain('Build Astronaut Academy')
  })

  it('skips the four-route picker and goes straight to contracts during onboarding', async () => {
    const player = {
      ...DEFAULT_STATE.player,
      freeOperations: false,
      missionsDone: 0,
      placed: ['launchpad'],
    }
    const catalog = buildRuntimeCatalog({
      catalog: STATIC_CATALOG,
      freeOperations: false,
      missionsDone: player.missionsDone,
      player,
    })
    const host = document.createElement('div')
    const root = createRoot(host)
    const onViewContracts = vi.fn()
    ;(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true

    await act(async () => {
      root.render(
        <LaunchpadScreen
          onBack={vi.fn()}
          onPick={vi.fn()}
          onViewContracts={onViewContracts}
          onLaunchpadAction={vi.fn()}
          onOpenHangar={vi.fn()}
          missionsDone={player.missionsDone}
          freeOperations={player.freeOperations}
          catalog={catalog}
          player={player}
        />,
      )
    })

    expect(host.textContent).toContain('YOUR MISSION')

    await act(async () => {
      host.querySelector<HTMLButtonElement>('[data-testid="launchpad-status-card"]')?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    expect(onViewContracts).toHaveBeenCalledTimes(1)
    expect(host.querySelector('[data-testid="launchpad-new-mission-menu"]')).toBeNull()
    await act(async () => root.unmount())
  })

  it('opens the four-route mission picker when the pad is clicked', async () => {
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
    expect(host.querySelector('[data-testid="launchpad-new-mission-contracts-btn"]')).not.toBeNull()
    expect(host.textContent).toContain('LAUNCH SATELLITE / TOOL')
    expect(host.textContent).toContain('GO MINING')
    expect(host.textContent).toContain('BUILD SOMETHING YOURSELF')
    expect(host.textContent).toContain('AVAILABLE CONTRACTS')

    await act(async () => {
      host.querySelector<HTMLButtonElement>('[data-testid="launchpad-new-mission-mining-btn"]')?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    expect(host.querySelector('[data-testid="launchpad-operation-brief-mining"]')).not.toBeNull()
    await act(async () => {
      host.querySelector<HTMLButtonElement>('[data-testid="launchpad-mining-sell-btn"]')?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
    expect(onPick).toHaveBeenCalledWith('freeops-self-directed-mining', 'sell')
    await act(async () => root.unmount())
  })

  it('keeps the physical launchpad available to create another mission while one is active', async () => {
    const player = {
      ...DEFAULT_STATE.player,
      activeMission: { id: 'baseline-extraction', label: 'Baseline extraction → Eros' },
      missionPhase: 'transit' as const,
      freeOperations: true,
      missionsDone: 3,
      placed: ['launchpad'],
    }
    const host = document.createElement('div')
    const root = createRoot(host)
    const onResumeMission = vi.fn()
    const onPick = vi.fn()
    const catalog = buildRuntimeCatalog({
      catalog: STATIC_CATALOG,
      freeOperations: true,
      missionsDone: player.missionsDone,
      player,
    })
    ;(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true

    await act(async () => {
      root.render(
        <LaunchpadScreen
          onBack={vi.fn()}
          onPick={onPick}
          onViewContracts={vi.fn()}
          onLaunchpadAction={vi.fn()}
          onOpenHangar={vi.fn()}
          onResumeMission={onResumeMission}
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

    expect(onResumeMission).not.toHaveBeenCalled()
    expect(host.querySelector('[data-testid="launchpad-new-mission-menu"]')).not.toBeNull()
    await act(async () => {
      host.querySelector<HTMLButtonElement>('[data-testid="launchpad-new-mission-mining-btn"]')?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
    await act(async () => {
      host.querySelector<HTMLButtonElement>('[data-testid="launchpad-mining-sell-btn"]')?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
    expect(onPick).toHaveBeenCalledWith('freeops-self-directed-mining', 'sell')
    await act(async () => root.unmount())
  })

  it('gates the off-world refinery build behind an existing silo and mining settlement', async () => {
    const basePlayer = {
      ...DEFAULT_STATE.player,
      freeOperations: true,
      missionsDone: 3,
      placed: ['launchpad'],
    }
    const catalog = buildRuntimeCatalog({
      catalog: STATIC_CATALOG,
      freeOperations: true,
      missionsDone: basePlayer.missionsDone,
      player: basePlayer,
    })
    ;(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true

    async function openBuildMenu(player: typeof basePlayer) {
      const host = document.createElement('div')
      const root = createRoot(host)
      await act(async () => {
        root.render(
          <LaunchpadScreen
            onBack={vi.fn()}
            onPick={vi.fn()}
            onViewContracts={vi.fn()}
            onLaunchpadAction={vi.fn()}
            onOpenHangar={vi.fn()}
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
      await act(async () => {
        host.querySelector<HTMLButtonElement>('[data-testid="launchpad-new-mission-build-btn"]')?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      })
      return { host, root }
    }

    const { host: withoutPrereqs, root: rootA } = await openBuildMenu(basePlayer)
    expect(withoutPrereqs.querySelector('[data-testid="launchpad-build-program-build-mars-mining-settlement"]')).not.toBeNull()
    expect(withoutPrereqs.querySelector('[data-testid="launchpad-build-program-build-remote-silo"]')).not.toBeNull()
    expect(withoutPrereqs.querySelector('[data-testid="launchpad-build-program-build-refinery"]')).toBeNull()
    await act(async () => rootA.unmount())

    const readyPlayer = {
      ...basePlayer,
      clientStructures: [
        { targetId: 'mars', structureKind: 'mining-settlement', clientId: 'mission-control', state: 'delivered' as const, startedAt: 0 },
        { targetId: 'mars', structureKind: 'mineral-silo', clientId: 'mission-control', state: 'delivered' as const, startedAt: 0 },
      ],
    }
    const { host: withPrereqs, root: rootB } = await openBuildMenu(readyPlayer)
    expect(withPrereqs.querySelector('[data-testid="launchpad-build-program-build-refinery"]')).not.toBeNull()
    await act(async () => rootB.unmount())
  })
})
