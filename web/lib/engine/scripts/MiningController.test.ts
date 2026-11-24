import { afterEach, expect, it, vi } from 'vitest'
import { Container } from 'pixi.js'
import { GameObject } from '../GameObject'
import { RuntimeContext } from '../RuntimeContext'
import { MiningController } from './MiningController'

afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals() })

function field(rate: number, width = 800, shipY = 200, random = 0.5) {
  vi.spyOn(Math, 'random').mockReturnValue(random)
  vi.stubGlobal('requestAnimationFrame', () => 0)
  let shipX = Math.min(200, width - 40)
  const container = new Container()
  const root = new GameObject('mining', 'Mining')
  const collected = vi.fn()
  const controller = new MiningController(new RuntimeContext(), {
    container, worldWidth: width, worldHeight: 700, surfaceY: 500, shipY, shipX: () => shipX,
    minerals: ['iron'], mineralColors: { iron: '#5c7c99', leonid_debris: '#9fd6e4' }, onCollect: collected,
    debris: { getSpawn: () => ({ mineral: 'leonid_debris', speedFactor: 1, ratePerMinute: rate, catchable: true }) },
  })
  root.addComponent(controller); root.start()
  return { root, controller, collected, container, steerTo: (x: number) => { shipX = x } }
}

it('an empty Catch costs nothing, then a Leonid in the beam can be collected only once', () => {
  const f = field(28)
  expect(f.controller.catchFragment()).toBe(false)
  f.root.update(0.001)
  f.root.update(3)
  expect(f.controller.catchFragment()).toBe(true)
  expect(f.controller.catchFragment()).toBe(false)
  expect(f.collected).toHaveBeenCalledExactlyOnceWith('leonid_debris')
  f.root.destroy(); f.container.destroy({ children: true })
})

it('zero rain rate never primes a stray fragment, while event scenery still updates', () => {
  const f = field(0)
  f.root.update(0.001); f.root.update(3)
  expect(f.root.children.filter(child => child.name === 'Debris')).toHaveLength(0)
  expect(f.controller.catchFragment()).toBe(false)
  expect(f.collected).not.toHaveBeenCalled()
  f.root.destroy(); f.container.destroy({ children: true })
})

// Exercise the old failure case: narrow screens, rain spread extremes and changed terrain speed.
it.each([0, 0.5, 1])('rain is visible with time to steer and catch on a phone (spread %s)', random => {
  const f = field(1, 390, 96, random)
  f.controller.setScrollSpeed(96)
  f.root.update(0.001)
  const fragment = f.root.children.find(child => child.name === 'Debris')!
  const first = { ...fragment.transform.position }
  expect(first.x).toBeGreaterThanOrEqual(24)
  expect(first.x).toBeLessThanOrEqual(366)
  expect(first.y).toBeGreaterThanOrEqual(24)
  // The terrain can speed up without dragging rain out of view or shortening its warning.
  for (let i = 0; i < 30; i++) f.root.update(0.1)
  expect(fragment.transform.position.x).toBe(first.x)
  expect(fragment.transform.position.y).toBeLessThan(96)
  f.steerTo(first.x)
  expect(f.controller.catchFragment()).toBe(true)
  expect(f.collected).toHaveBeenCalledExactlyOnceWith('leonid_debris')
  f.root.destroy(); f.container.destroy({ children: true })
})
