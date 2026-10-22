// @vitest-environment jsdom

import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { renderToStaticMarkup } from 'react-dom/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import LaunchpadScreen from './LaunchpadScreen'
import { STATIC_CATALOG } from '@/lib/catalog'
import { DEFAULT_STATE } from '@/lib/game-state'
import { buildRuntimeCatalog } from '@/lib/runtimeCatalog'

describe('Launchpad own-program actions', () => {
  beforeEach(() => {
    window.matchMedia = vi.fn().mockReturnValue({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })
    if (!('IntersectionObserver' in window)) {
      class ImmediateIntersectionObserver {
        observe() {}
        unobserve() {}
        disconnect() {}
      }
      vi.stubGlobal('IntersectionObserver', ImmediateIntersectionObserver)
    }
  })

  it('keeps an unplanned pad empty and only exposes launch controls for a staged vehicle', () => {
    const noop = vi.fn()
    const empty = renderToStaticMarkup(
      <LaunchpadScreen onBack={noop} onPick={noop} onViewContracts={noop} onLaunchpadAction={noop} missionsDone={0} freeOperations={false} catalog={STATIC_CATALOG} player={DEFAULT_STATE.player} />,
    )
    expect(empty).toContain('data-assembly="idle"')
    expect(empty).toContain('Select mission')
    expect(empty).not.toContain('data-testid="launch-btn"')

    const mission = STATIC_CATALOG.missions.find(candidate => candidate.targetId)!
    const target = STATIC_CATALOG.targets.find(candidate => candidate.id === mission.targetId)!
    const planned = renderToStaticMarkup(
      <LaunchpadScreen onBack={noop} onPick={noop} onViewContracts={noop} onLaunchpadAction={noop} missionsDone={0} freeOperations={false} catalog={STATIC_CATALOG} player={DEFAULT_STATE.player} mission={{ title: mission.title }} target={target} />,
    )
    expect(planned).toContain('data-assembly="design"')
    expect(planned).toContain('Build rocket')
    expect(planned).toContain('Change mission')
    expect(planned).not.toContain('data-testid="builder-dismantle"')
  })

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
        onResumeMission={noop}
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
    expect(markup).not.toContain('data-testid="base-dock"')
    expect(markup).not.toContain('data-testid="launchpad-francs-chip"')
    expect(markup).not.toContain('LAUNCHPAD')
    expect(markup).not.toContain('FRANCS')
    expect(markup).not.toContain('data-testid="launchpad-primary-mission-btn"')
  })

  it('does not paint the old program menu over the pad', () => {
    const player = {
      ...DEFAULT_STATE.player,
      freeOperations: true,
      missionsDone: 3,
      resourceFocus: { label: 'Mineral Vault', minerals: { aluminium: 15 } },
    }
    const catalog = buildRuntimeCatalog({ catalog: STATIC_CATALOG, freeOperations: true, missionsDone: 3, player })
    const markup = renderToStaticMarkup(
      <LaunchpadScreen onBack={vi.fn()} onPick={vi.fn()} onViewContracts={vi.fn()} onLaunchpadAction={vi.fn()} missionsDone={3} freeOperations catalog={catalog} player={player} missionMenuOpen />,
    )
    expect(markup).not.toContain('data-testid="launchpad-new-mission-menu"')
    expect(markup).not.toContain('data-testid="launchpad-new-mission-resource-focus-btn"')
    expect(markup).not.toContain('Your Program')
    expect(markup).toContain('data-testid="launchpad-new-mission-btn"')
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
        missionsDone={player.missionsDone}
        freeOperations={player.freeOperations}
        catalog={catalog}
        player={player}
      />,
    )

    expect(markup).toContain('data-testid="launchpad-new-mission-btn"')
    expect(markup).toContain('data-testid="top-bar-back"')
    expect(markup).not.toContain('data-testid="settings-button"')
    expect(markup).not.toContain('data-testid="hub-dock-prev"')
    expect(markup).not.toContain('data-testid="hub-dock-next"')
    expect(markup).not.toContain('NEW MISSION')
    expect(markup).not.toContain('LAUNCHPAD')
    expect(markup).not.toContain('data-testid="launchpad-primary-mission-btn"')
    expect(markup).not.toContain('data-testid="launchpad-create-mission-btn"')
    expect(markup).not.toContain('data-testid="launchpad-launch-infrastructure-btn"')
    expect(markup).not.toContain('data-testid="launchpad-guide-open"')
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
          missionsDone={player.missionsDone}
          freeOperations={player.freeOperations}
          catalog={catalog}
          player={player}
        />,
      )
    })

    expect(host.textContent).not.toContain('YOUR MISSION')
    expect(host.textContent).not.toContain('LAUNCHPAD')

    await act(async () => {
      host.querySelector<HTMLButtonElement>('[data-testid="launchpad-status-card"]')?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    expect(onViewContracts).toHaveBeenCalledTimes(1)
    expect(host.querySelector('[data-testid="launchpad-new-mission-menu"]')).toBeNull()
    await act(async () => root.unmount())
  })

  it('opens the mission board from the pad instead of a route picker', async () => {
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
    const onViewContracts = vi.fn()
    const onPick = vi.fn()
    ;(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true

    await act(async () => {
      root.render(
        <LaunchpadScreen
          onBack={vi.fn()}
          onPick={onPick}
          onViewContracts={onViewContracts}
          onLaunchpadAction={vi.fn()}
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

    expect(onViewContracts).toHaveBeenCalledTimes(1)
    expect(onPick).not.toHaveBeenCalled()
    expect(host.querySelector('[data-testid="launchpad-new-mission-menu"]')).toBeNull()
    await act(async () => root.unmount())
  })

  it('keeps an active run resumable when the pad opens the mission board', async () => {
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
    const onViewContracts = vi.fn()
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
          onPick={vi.fn()}
          onViewContracts={onViewContracts}
          onLaunchpadAction={vi.fn()}
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
    expect(onViewContracts).toHaveBeenCalledTimes(1)
    expect(host.querySelector('[data-testid="launchpad-resume-mission-btn"]')).not.toBeNull()
    expect(host.querySelector('[data-testid="launchpad-new-mission-menu"]')).toBeNull()
    await act(async () => root.unmount())
  })
})
