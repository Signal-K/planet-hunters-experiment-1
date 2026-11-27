// @vitest-environment jsdom
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { TARGETS } from '@/lib/data/targets'
import { GalaxyMap } from './MissionBoard'

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
