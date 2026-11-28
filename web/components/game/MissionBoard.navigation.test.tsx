// @vitest-environment jsdom
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { TARGETS } from '@/lib/data/targets'
import { STATIC_CATALOG } from '@/lib/catalog'
import { DEFAULT_STATE } from '@/lib/game-state'
import { buildRuntimeCatalog } from '@/lib/runtimeCatalog'
import MissionBoard, { GalaxyMap } from './MissionBoard'

vi.mock('./screens/SolarOrbitGlobe', () => ({ default: () => null }))
vi.mock('./screens/MapPlanet3D', () => ({ default: () => null }))

describe('solar system navigation', () => {
  const element = document.createElement('div')
  const root = createRoot(element)
  const pick = vi.fn()
  const openMoons = vi.fn()
  const render = (view: 'system' | 'moons', moonParentId?: string) => act(() => root.render(
    <GalaxyMap targets={TARGETS} mode="pick" view={view} onView={() => {}} onPick={pick} onOpenMoons={openMoons} moonParentId={moonParentId} />,
  ))
  const click = (id: string) => act(() => (element.querySelector(`[data-testid="map-node-${id}"]`) as HTMLButtonElement).click())

  afterEach(() => { act(() => root.unmount()); element.remove() })

  it('opens a planet system before selecting the planet or one of its moons', () => {
    render('system')
    click('mars')
    expect(openMoons).toHaveBeenCalledWith('mars')
    expect(pick).not.toHaveBeenCalled()
    render('moons', 'mars')
    click('phobos')
    expect(pick).toHaveBeenCalledWith('phobos')
    click('mars')
    expect(pick).toHaveBeenCalledWith('mars')
    pick.mockClear(); openMoons.mockClear()
    render('system')
    click('earth')
    expect(openMoons).toHaveBeenCalledWith('earth')
    expect(pick).not.toHaveBeenCalled()
    render('moons', 'earth')
    click('earth')
    expect(pick).toHaveBeenCalledWith('earth')
    render('system')
    click('venus')
    expect(pick).toHaveBeenCalledWith('venus')
  })
})

describe('location mission list', () => {
  it('shows flyby and orbit missions when a player opens Mars', () => {
    const element = document.createElement('div')
    const root = createRoot(element)
    const player = { ...DEFAULT_STATE.player, freeOperations: true, missionsDone: 3, placed: ['launchpad', 'control-station'], agencyUnlocks: ['launch', 'data-hub'] }
    const catalog = buildRuntimeCatalog({ catalog: STATIC_CATALOG, freeOperations: true, missionsDone: 3, player })
    const accept = vi.fn()
    act(() => root.render(<MissionBoard catalog={catalog} player={player} cards={[]} selectedIndex={0} onSelectRelative={() => {}} onSelectMission={() => {}} onAccept={accept} onClose={() => {}} onOpenLog={() => {}} onOpenEvent={() => {}} tutorialBlocked={false} onboardingComplete />))
    const click = (id: string) => act(() => (element.querySelector(`[data-testid="map-node-${id}"]`) as HTMLButtonElement).click())
    click('mars'); click('mars')
    expect(element.querySelector('[data-testid="location-step-flyby-mars"]')?.textContent).toContain('Flyby')
    expect(element.querySelector('[data-testid="location-step-probe-launch-mars"]')?.textContent).toContain('Survey probe')
    act(() => (element.querySelector('[data-testid="map-back"]') as HTMLButtonElement).click())
    click('mercury')
    const flyby = element.querySelector('[data-testid="location-step-flyby-mercury"] button') as HTMLButtonElement
    expect(flyby.disabled).toBe(false)
    act(() => flyby.click())
    expect(accept).toHaveBeenCalledWith('flyby-mercury')
    act(() => root.unmount())
  })
})

describe('live event map handoff', () => {
  it('opens the real shower without awarding a preview reward and hides its marker after expiry', () => {
    const clock = vi.spyOn(Date, 'now').mockReturnValue(Date.parse('2026-11-17T12:00:00Z'))
    const element = document.createElement('div')
    const root = createRoot(element)
    const player = { ...structuredClone(DEFAULT_STATE.player), freeOperations: true, missionsDone: 3, orionidsEventStage: 3 as const }
    const before = structuredClone(player)
    const accept = vi.fn()
    const render = (p: typeof player) => act(() => root.render(<MissionBoard catalog={buildRuntimeCatalog({ catalog: STATIC_CATALOG, freeOperations: true, missionsDone: 3, player: p })} player={p} cards={[]} selectedIndex={0} onSelectRelative={() => {}} onSelectMission={() => {}} onAccept={accept} onClose={() => {}} onOpenLog={() => {}} onOpenEvent={() => {}} tutorialBlocked={false} onboardingComplete />))
    const click = (testId: string) => act(() => (element.querySelector(`[data-testid="${testId}"]`) as HTMLButtonElement).click())
    try {
      render(player)
      click('map-live-event')
      expect(element.querySelector('[data-testid="map-event-objective"]')?.textContent).toContain('catch 20 fragments')
      expect(element.querySelector('[data-testid="map-event-result"]')?.textContent).toContain('0 / 2')
      expect(player).toEqual(before)
      click('map-event-start')
      expect(accept).toHaveBeenCalledWith('self-directed-leonids-shower-run')
      clock.mockReturnValue(Date.parse('2026-12-01T12:00:00Z'))
      const earned = { ...player, badges: { 'leonids-2026': { eventId: 'leonids-2026', tier: 'gold' as const, earnedAt: 100 } }, showerChains: { 'leonids-2026': { stage: 2 as const, at: 100 } } }
      render(earned)
      expect(element.querySelector('[data-testid="map-live-event"]')).toBeNull()
      expect(element.querySelector('[data-testid="map-event-readout"]')).toBeNull()
      click('mission-board-tab-events')
      click('event-select-leonids-2026')
      expect(element.querySelector('[data-testid="events-card-leonids-2026"]')?.textContent).toContain('GOLD BADGE EARNED')
      expect(earned.badges['leonids-2026'].tier).toBe('gold')
    } finally { act(() => root.unmount()); clock.mockRestore() }
  })
})
