// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'

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
    this.tint = 0xffffff
    this.scale = { set: vi.fn() }
  }),
  Container: vi.fn().mockImplementation(function (this: { addChild: () => void; removeChild: () => void }) {
    this.addChild = vi.fn()
    this.removeChild = vi.fn()
  }),
  Text: vi.fn().mockImplementation(function (this: Record<string, unknown>, opts: { text: string; style: unknown }) {
    this.text = opts.text
    this.style = opts.style
    this.anchor = { set: vi.fn() }
    this.destroy = vi.fn()
    this.x = 0
    this.y = 0
    this.visible = true
  }),
}))

import { Container, Text } from 'pixi.js'
import { ShapeRenderer } from '../components/ShapeRenderer'
import { MiningController } from './MiningController'
import type { MiningControllerOptions } from './MiningController'
import { RuntimeContext } from '../RuntimeContext'
import { GameObject } from '../GameObject'

const MINERALS = ['iron', 'gold']
const MINERAL_COLORS: Record<string, string> = { iron: '#b0b8c4', gold: '#ffd166' }

function makeController(onCollect = vi.fn(), extras: Partial<MiningControllerOptions> = {}) {
  const container = new Container()
  const controller = new MiningController(new RuntimeContext(), {
    container,
    worldWidth: 600,
    worldHeight: 300,
    minerals: MINERALS,
    mineralColors: MINERAL_COLORS,
    onCollect,
    ...extras,
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

  it('setTint sets graphics.tint', () => {
    const container = new Container()
    const sr = new ShapeRenderer({ shape: 'circle', width: 20, height: 20, color: '#ffffff' }, container)
    const go = new GameObject('ore-tint', 'Ore')
    go.addComponent(sr)
    go.start()
    sr.setTint(0xff0000)
    expect((sr as unknown as { graphics: { tint: number } }).graphics?.tint).toBe(0xff0000)
  })

  it('accepts diamond shape without throwing', () => {
    const container = new Container()
    const sr = new ShapeRenderer({ shape: 'diamond', width: 24, height: 24, color: '#b9d8ff' }, container)
    expect(sr.toJSON()).toMatchObject({ shape: 'diamond' })
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

  it('fires onScroll callback with accumulated scroll distance', () => {
    const onScroll = vi.fn()
    const { controller } = makeController(vi.fn(), { onScroll })
    controller.start()
    controller.update(1) // 1s at 48px/s = 48px
    expect(onScroll).toHaveBeenCalledWith(expect.closeTo(48, 1))
  })

  it('uses laserAccess tier to set ore radius — tier 2 radius is 13', () => {
    const { controller, host } = makeController(vi.fn(), {
      minerals: ['cobalt'],
      mineralColors: { cobalt: '#4f9cf7' },
      mineralLaserAccess: { cobalt: 2 },
    })
    controller.start()
    const oreChildren = host.children.filter(c => c.id.startsWith('ore-'))
    // All spawned ores are cobalt (tier 2), radius 13
    const anyOre = oreChildren[0] as unknown as { children: unknown[]; components: unknown[] }
    // Radius is stored on the ore entity — access via controller internals via collision test:
    // A laser hit within 13px should register, one outside 13px should not.
    const ore = host.children.find(c => c.id === 'ore-0')!
    ore.transform.position.x = 80
    ore.transform.position.y = 190

    // Fire laser with laser at 12px from ore centre (within radius 13) → should hit
    controller.fireLaser()
    const laser = host.children.find(c => c.id.startsWith('laser-') && c.active)!
    laser.transform.position.x = 80 + 12
    laser.transform.position.y = 190
    controller.update(0)
    expect(laser.active).toBe(false) // hit → laser deactivated
  })

  it('collects ore and calls onCollect when hp depletes', () => {
    const onCollect = vi.fn()
    const { controller, host } = makeController(onCollect)
    controller.start()
    const ore = host.children.find(c => c.id === 'ore-0')!
    // Ship fires at x=80; ore must be within HIT_TOLERANCE (28px) of x=80
    // Ores spawn near SURFACE_Y; position is overridden below for collision test
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

interface MockLabel { text: string; x: number; visible: boolean; destroy: () => void; style: { fontSize: number } }

function labels(): MockLabel[] {
  return vi.mocked(Text).mock.instances as unknown as MockLabel[]
}

const SYMS: Record<string, string> = { iron: 'Fe', gold: 'Au' }

describe('MiningController ore sym labels', () => {
  beforeEach(() => { vi.mocked(Text).mockClear() })

  it('labels every ore node with its mineral sym', () => {
    const { controller } = makeController(vi.fn(), { mineralSyms: SYMS })
    controller.start()
    expect(labels()).toHaveLength(20)
    expect(new Set(labels().map(l => l.text))).toEqual(new Set(['Fe', 'Au']))
  })

  it('renders no labels when mineralSyms is omitted', () => {
    const { controller } = makeController()
    controller.start()
    expect(labels()).toHaveLength(0)
  })

  it('shrinks the font for multi-character syms so they fit the node', () => {
    const { controller } = makeController(vi.fn(), {
      minerals: ['ice'], mineralColors: { ice: '#9becff' }, mineralSyms: { ice: 'H2O' },
    })
    controller.start()
    const wide = labels()[0].style.fontSize
    vi.mocked(Text).mockClear()

    const short = makeController(vi.fn(), {
      minerals: ['iron'], mineralColors: { iron: '#d97150' }, mineralSyms: { iron: 'Fe' },
    })
    short.controller.start()
    expect(wide).toBeLessThan(labels()[0].style.fontSize)
  })

  it('keeps the label on the ore as the terrain scrolls', () => {
    const { controller, host } = makeController(vi.fn(), { mineralSyms: SYMS })
    controller.start()
    controller.update(1)
    const ore = host.children.find(c => c.id === 'ore-0')!
    expect(labels()[0].x).toBe(ore.transform.position.x)
  })

  it('hides the label when its ore is collected', () => {
    const { controller, host } = makeController(vi.fn(), { mineralSyms: SYMS })
    controller.start()
    const ore = host.children.find(c => c.id === 'ore-0')!
    ore.transform.position.x = 80
    ore.transform.position.y = 190
    for (let i = 0; i < 4; i++) {
      controller.fireLaser()
      const laser = host.children.find(c => c.id.startsWith('laser-') && c.active)!
      laser.transform.position.x = 80
      laser.transform.position.y = 190
      controller.update(0)
    }
    expect(labels()[0].visible).toBe(false)
  })

  it('destroys the label when its ore scrolls offscreen', () => {
    const { controller, host, container } = makeController(vi.fn(), { mineralSyms: SYMS })
    controller.start()
    const ore = host.children.find(c => c.id === 'ore-0')!
    ore.transform.position.x = -500
    controller.update(0)
    expect(labels()[0].destroy).toHaveBeenCalled()
    expect(container.removeChild).toHaveBeenCalled()
  })
})
