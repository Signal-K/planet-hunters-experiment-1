// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('pixi.js', () => ({
  Graphics: vi.fn().mockImplementation(function (this: Record<string, unknown>) {
    this.poly = vi.fn().mockReturnThis()
    this.circle = vi.fn().mockReturnThis()
    this.ellipse = vi.fn().mockReturnThis()
    this.rect = vi.fn().mockReturnThis()
    this.fill = vi.fn().mockReturnThis()
    this.stroke = vi.fn().mockReturnThis()
    this.moveTo = vi.fn().mockReturnThis()
    this.lineTo = vi.fn().mockReturnThis()
    this.destroy = vi.fn()
    this.x = 0
    this.y = 0
    this.alpha = 1
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
  Sprite: vi.fn().mockImplementation(function (this: Record<string, unknown>) {
    this.anchor = { set: vi.fn() }
    this.scale = { set: vi.fn() }
    this.destroy = vi.fn()
    this.x = 0
    this.y = 0
    this.tint = 0xffffff
    this.visible = true
    this.texture = null
  }),
}))

import { Container, Text } from 'pixi.js'
import { ShapeRenderer } from '../components/ShapeRenderer'
import { MiningController, SHIP_X } from './MiningController'
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

/** Hold the beam for `seconds` in 50ms steps. */
function hold(controller: MiningController, seconds: number) {
  controller.setBeam(true)
  for (let t = 0; t < seconds; t += 0.05) controller.update(0.05)
}

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

  it('beam is off until fire is held, and a boulder blocks it', () => {
    const onBeamEnd = vi.fn()
    const { controller, host } = makeController(vi.fn(), { rockColor: 0x886644, surfaceY: 200, onBeamEnd })
    controller.start()
    const rocks = (controller as unknown as { obstacles: { x: number; hp: number }[] }).obstacles
    expect(rocks.length).toBeGreaterThan(0)
    const rock = rocks[0]
    rock.x = SHIP_X
    for (const c of host.children) if (c.id.startsWith('ore-')) c.transform.position.x = 5000
    controller.update(0)
    expect(rock.hp).toBe(1.4) // not firing: untouched
    hold(controller, 0.5)
    expect(rock.hp).toBeLessThan(1.4)
    expect(onBeamEnd).toHaveBeenLastCalledWith(expect.any(Number))
    hold(controller, 1.6)
    expect((controller as unknown as { obstacles: unknown[] }).obstacles).not.toContain(rock)
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
    const ore = host.children.find(c => c.id === 'ore-0')!
    ore.transform.position.x = 80
    ore.transform.position.y = 190
    expect(oreChildren.length).toBeGreaterThan(0)
    // Tier-2 ore (hp 2) survives a single hp worth of beam, and breaks after two.
    hold(controller, 0.6)
    expect(ore.active).toBe(true)
    hold(controller, 1.2)
    expect(ore.active).toBe(false)
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

    hold(controller, 3)

    expect(onCollect).toHaveBeenCalled()
    expect(onCollect.mock.calls[0][0]).toBe('iron')
  })

  it('freezes the scene briefly on a collect, then resumes (hit-stop)', () => {
    const { controller, host } = makeController(vi.fn())
    controller.start()
    const ore = host.children.find(c => c.id === 'ore-0')!
    ore.transform.position.x = 80
    ore.transform.position.y = 190
    hold(controller, 3)
    const other = host.children.find(c => c.id === 'ore-1')!
    const x0 = other.transform.position.x
    controller.update(0.03) // inside the freeze: nothing scrolls
    expect(other.transform.position.x).toBe(x0)
    controller.update(0.2) // past the freeze: scrolling resumes
    expect(other.transform.position.x).toBeLessThan(x0)
  })

  it('calls onHit for each hp chipped, including a partial hit that does not destroy the ore', () => {
    const onHit = vi.fn()
    const { controller, host } = makeController(vi.fn(), { onHit })
    controller.start()
    const ore = host.children.find(c => c.id === 'ore-0')!
    ore.transform.position.x = 80
    ore.transform.position.y = 190

    hold(controller, 0.6)
.toHaveBeenCalledTimes(1)
  })
})

interface MockLabel { text: string; x: number; y: number; visible: boolean; destroy: () => void; style: { fontSize: number } }

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

  it('puts the sym on the buried deposit, under the surface line', () => {
    const { controller } = makeController(vi.fn(), { mineralSyms: SYMS, chipFill: 0x334455, chipShade: 0x112233 })
    controller.start()
    expect(labels()[0].y).toBeGreaterThan(320)
  })

  it('buries pixel deposits under the crust at varied depths the tier-1 laser can still reach', () => {
    const onCollect = vi.fn()
    const { controller, host } = makeController(onCollect, {
      pixelScale: 2,
      depositFrames: [{}, {}] as MiningControllerOptions['depositFrames'],
      surfaceY: 200,
      worldHeight: 640,
      pinScroll: true,
    })
    controller.start()
    const ores = (controller as unknown as { ores: { go: { transform: { position: { y: number } } } }[] }).ores
    const depths = ores.map(ore => ore.go.transform.position.y - 200)
    expect(new Set(depths).size).toBeGreaterThan(1)
    for (const depth of depths) {
      expect(depth - 14).toBeGreaterThan(16)
      expect(depth).toBeGreaterThanOrEqual(52)
      expect(depth).toBeLessThanOrEqual(84)
    }
    const ore = host.children.find(child => child.id === 'ore-0')!
    ore.transform.position.x = SHIP_X
    hold(controller, 1)
    expect(onCollect).toHaveBeenCalled()
  })

  it('keeps deposits a native stride apart', () => {
    const { controller } = makeController(vi.fn(), { worldWidth: 600, mineralSyms: SYMS, chipFill: 0x334455 })
    controller.start()
    const ores = (controller as unknown as { ores: { go: { transform: { position: { x: number } } } }[] }).ores
    for (let i = 1; i < ores.length; i++) {
      const gap = ores[i].go.transform.position.x - ores[i - 1].go.transform.position.x
      expect(gap).toBe(280)
    }
    expect(ores[0].go.transform.position.x).toBe(SHIP_X + 160)
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
    hold(controller, 3)
    expect(labels()[0].visible).toBe(false)
  })

  it('treats ?scroll= as screen-widths and keeps the native stride', () => {
    const width = 400
    const placed = (screens: number) => {
      const { controller } = makeController(vi.fn(), {
        worldWidth: width,
        scrollScreens: screens,
        pinScroll: true,
        leadMinerals: ['iron', 'carbon', 'ice'],
        minerals: ['gold'],
        mineralColors: { iron: '#e06a22', carbon: '#161616', ice: '#2ec8e8', gold: '#ffd166' },
      })
      controller.start()
      return (controller as unknown as { ores: { mineral: string; go: { transform: { position: { x: number } } } }[] }).ores
    }
    const anchor = SHIP_X + 160
    const first = placed(0)
    expect(first[0].mineral).toBe('iron')
    expect(first[0].go.transform.position.x).toBe(anchor)
    expect(first[1].go.transform.position.x - first[0].go.transform.position.x).toBe(280)
    expect(placed(1)[0].go.transform.position.x).toBe(anchor - width)
  })

  it('places lead minerals first, each a stride apart', () => {
    const { controller } = makeController(vi.fn(), {
      worldWidth: 390,
      leadMinerals: ['iron', 'carbon', 'ice'],
      minerals: ['gold'],
      mineralColors: { iron: '#e06a22', carbon: '#161616', ice: '#2ec8e8', gold: '#ffd166' },
    })
    controller.start()
    const ores = (controller as unknown as { ores: { mineral: string; go: { transform: { position: { x: number } } } }[] }).ores
    expect(ores.slice(0, 3).map(ore => ore.mineral)).toEqual(['iron', 'carbon', 'ice'])
    const xs = ores.slice(0, 3).map(ore => ore.go.transform.position.x)
    expect(xs[0]).toBe(SHIP_X + 160)
    expect(xs[1] - xs[0]).toBe(280)
    expect(xs[2] - xs[1]).toBe(280)
  })

  it('does not spawn shower debris when the event is off', () => {
    const { controller, host } = makeController(vi.fn(), { debris: { getSpawn: () => null } })
    controller.start()
    controller.update(2)
    expect(host.children.some(c => c.id.startsWith('debris-'))).toBe(false)
    expect(host.children.filter(c => c.id.startsWith('ore-'))).toHaveLength(20)
  })

  it('mines a landed chunk with the held beam and ignores it while it is still falling', () => {
    const onCollect = vi.fn()
    const { controller, host } = makeController(onCollect, {
      mineralColors: MINERAL_COLORS,
      debris: { getSpawn: () => ({ mineral: 'orionid_debris', ratePerMinute: 600, speedFactor: 1 }) },
    })
    controller.start()
    controller.update(0.05)
    const debris = host.children.find(c => c.id.startsWith('debris-'))
    expect(debris).toBeTruthy()
    debris!.transform.position.x = 80
    debris!.transform.position.y = 40
    controller.setBeam(true)
    controller.update(0.2)
    expect(onCollect).not.toHaveBeenCalled()
    controller.setBeam(false)

    debris!.transform.position.y = 316
    controller.update(0)
    hold(controller, 1)
    expect(onCollect).toHaveBeenCalledTimes(1)
    expect(onCollect).toHaveBeenCalledWith('orionid_debris')
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
