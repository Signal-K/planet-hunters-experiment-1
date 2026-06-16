// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest'

vi.mock('pixi.js', () => ({
  Graphics: vi.fn().mockImplementation(function (this: Record<string, unknown>) {
    this.poly = vi.fn().mockReturnThis()
    this.circle = vi.fn().mockReturnThis()
    this.rect = vi.fn().mockReturnThis()
    this.fill = vi.fn().mockReturnThis()
    this.stroke = vi.fn().mockReturnThis()
    this.destroy = vi.fn()
    this.x = 0
    this.y = 0
    this.rotation = 0
    this.scale = { set: vi.fn() }
  }),
  Container: vi.fn().mockImplementation(function (this: { addChild: () => void }) {
    this.addChild = vi.fn()
  }),
}))

import { Container } from 'pixi.js'
import { ShapeRenderer } from '../components/ShapeRenderer'
import { MiningController } from './MiningController'
import { RuntimeContext } from '../RuntimeContext'
import { GameObject } from '../GameObject'

const MINERALS = ['iron', 'gold']
const MINERAL_COLORS: Record<string, string> = { iron: '#b0b8c4', gold: '#ffd166' }

function makeController(onCollect = vi.fn()) {
  const container = new Container()
  const controller = new MiningController(new RuntimeContext(), {
    container,
    worldWidth: 600,
    worldHeight: 300,
    minerals: MINERALS,
    mineralColors: MINERAL_COLORS,
    onCollect,
  })
  const host = new GameObject('mining-controller', 'Mining Controller')
  host.addComponent(controller)
  return { controller, host, container, onCollect }
}

describe('ShapeRenderer', () => {
  it('serializes to ComponentData', () => {
    const container = new Container()
    const sr = new ShapeRenderer({ shape: 'circle', width: 28, height: 28, color: '#ffffff' }, container)
    expect(sr.toJSON()).toEqual({ type: 'ShapeRenderer', shape: 'circle', width: 28, height: 28, color: '#ffffff' })
  })

  it('syncs graphics transform from the GameObject on update', () => {
    const container = new Container()
    const sr = new ShapeRenderer({ shape: 'rect', width: 14, height: 4, color: '#9becff' }, container)
    const go = new GameObject('laser-0', 'Laser', { position: { x: 10, y: 20 } })
    go.addComponent(sr)
    go.start()
    go.transform.position.x = 99
    go.update(1 / 60)
    expect(container.addChild).toHaveBeenCalled()
  })
})

describe('MiningController', () => {
  it('spawns 20 ore entities on start', () => {
    const { controller, host } = makeController()
    controller.start()
    const oreChildren = host.children.filter(c => c.id.startsWith('ore-'))
    expect(oreChildren).toHaveLength(20)
  })

  it('scrolls ore positions left over time', () => {
    const { controller, host } = makeController()
    controller.start()
    const ore = host.children.find(c => c.id === 'ore-0')!
    const before = ore.transform.position.x
    controller.update(1)
    expect(ore.transform.position.x).toBeLessThan(before)
  })

  it('fires a laser projectile that moves down', () => {
    const { controller, host } = makeController()
    controller.start()
    controller.fireLaser()
    const laser = host.children.find(c => c.id.startsWith('laser-'))!
    const before = laser.transform.position.y
    controller.update(1)
    expect(laser.transform.position.y).toBeGreaterThan(before)
  })

  it('collects ore and calls onCollect when hp depletes', () => {
    const onCollect = vi.fn()
    const { controller, host } = makeController(onCollect)
    controller.start()
    const ore = host.children.find(c => c.id === 'ore-0')!
    // Ship fires at x=80; ore must be within HIT_TOLERANCE (28px) of x=80
    // Ores spawn at y = SURFACE_Y - ORE_SIZE/2 = 200 - 10 = 190
    ore.transform.position.x = 80
    ore.transform.position.y = 190

    // Fire enough lasers to deplete ore hp (maxHp is 2-3)
    for (let i = 0; i < 4; i++) {
      controller.fireLaser()
      const laser = host.children.find(c => c.id.startsWith('laser-') && c.active)!
      laser.transform.position.x = 80
      laser.transform.position.y = 190 // laser at ore's y → collision
      controller.update(0) // zero dt: resolve collision without moving
    }

    expect(onCollect).toHaveBeenCalled()
    expect(onCollect.mock.calls[0][0]).toBe('iron')
  })
})
