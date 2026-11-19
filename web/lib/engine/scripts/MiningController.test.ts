import { afterEach, expect, it, vi } from 'vitest'
import { Container } from 'pixi.js'
import { GameObject } from '../GameObject'
import { RuntimeContext } from '../RuntimeContext'
import { MiningController } from './MiningController'

afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals() })

function field(rate: number) {
  vi.spyOn(Math, 'random').mockReturnValue(0.5)
  vi.stubGlobal('requestAnimationFrame', () => 0)
  const container = new Container()
  const root = new GameObject('mining', 'Mining')
  const collected = vi.fn()
  const controller = new MiningController(new RuntimeContext(), {
    container, worldWidth: 800, worldHeight: 700, surfaceY: 500, shipY: 200, shipX: () => 200,
    minerals: ['iron'], mineralColors: { iron: '#5c7c99', leonid_debris: '#9fd6e4' }, onCollect: collected,
    debris: { getSpawn: () => ({ mineral: 'leonid_debris', speedFactor: 1, ratePerMinute: rate, catchable: true }) },
  })
  root.addComponent(controller); root.start()
  return { root, controller, collected, container }
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
