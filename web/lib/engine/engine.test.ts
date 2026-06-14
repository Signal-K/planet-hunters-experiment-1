// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

vi.mock('pixi.js', () => ({
  Assets: { load: vi.fn().mockResolvedValue({}) },
  Texture: { WHITE: { id: 'placeholder-white' } },
  Sprite: vi.fn().mockImplementation(function (this: Record<string, unknown>) {
    this.anchor = { set: vi.fn() }
    this.destroy = vi.fn()
    this.x = 0
    this.y = 0
    this.rotation = 0
    this.scale = { set: vi.fn() }
    this.tint = 0xffffff
  }),
  Container: vi.fn().mockImplementation(() => ({
    addChild: vi.fn(),
  })),
}))

import type { Application } from 'pixi.js'
import { Transform, GameObject } from './GameObject'
import { Scene } from './Scene'
import { GameLoop } from './GameLoop'
import { SpriteRenderer, wireSpriteRenderers } from './components/SpriteRenderer'
import { AssetManager } from './AssetManager'
import { ScriptBehaviour } from './components/ScriptBehaviour'
import { RuntimeContext } from './RuntimeContext'
import { InputManager, screenToWorld, pointInBounds } from './InputManager'
import type { Component, EntityData, SceneData } from './types'

// ─── Transform ───────────────────────────────────────────────────────────────

describe('Transform', () => {
  it('has zero-position, zero-rotation, unit-scale by default', () => {
    const t = new Transform()
    expect(t.position).toEqual({ x: 0, y: 0 })
    expect(t.rotation).toBe(0)
    expect(t.scale).toEqual({ x: 1, y: 1 })
  })

  it('accepts partial data — missing fields get defaults', () => {
    const t = new Transform({ position: { x: 5, y: 10 } })
    expect(t.position).toEqual({ x: 5, y: 10 })
    expect(t.rotation).toBe(0)
    expect(t.scale).toEqual({ x: 1, y: 1 })
  })

  it('preserves all supplied fields', () => {
    const t = new Transform({ position: { x: 1, y: 2 }, rotation: Math.PI, scale: { x: 2, y: 3 } })
    expect(t.position).toEqual({ x: 1, y: 2 })
    expect(t.rotation).toBe(Math.PI)
    expect(t.scale).toEqual({ x: 2, y: 3 })
  })
})

// ─── GameObject ──────────────────────────────────────────────────────────────

function makeComp(type = 'TestComp'): Component {
  return {
    type,
    gameObject: null as unknown as GameObject,
    start: vi.fn(),
    update: vi.fn(),
    destroy: vi.fn(),
    toJSON: vi.fn().mockReturnValue({ type }),
  }
}

describe('GameObject', () => {
  it('addComponent sets gameObject ref and returns the component', () => {
    const obj = new GameObject('a', 'A')
    const comp = makeComp()
    const returned = obj.addComponent(comp)
    expect(returned).toBe(comp)
    expect(comp.gameObject).toBe(obj)
    expect(obj.components).toContain(comp)
  })

  it('getComponent finds by type string', () => {
    const obj = new GameObject('a', 'A')
    const comp = makeComp('Foo')
    obj.addComponent(comp)
    expect(obj.getComponent('Foo')).toBe(comp)
    expect(obj.getComponent('Bar')).toBeNull()
  })

  it('addChild sets parent and appends to children', () => {
    const parent = new GameObject('p', 'Parent')
    const child = new GameObject('c', 'Child')
    parent.addChild(child)
    expect(child.parent).toBe(parent)
    expect(parent.children).toContain(child)
  })

  it('start() calls start on all components and recursively on children', () => {
    const parent = new GameObject('p', 'Parent')
    const child = new GameObject('c', 'Child')
    parent.addChild(child)
    const pc = makeComp(); parent.addComponent(pc)
    const cc = makeComp(); child.addComponent(cc)
    parent.start()
    expect(pc.start).toHaveBeenCalledOnce()
    expect(cc.start).toHaveBeenCalledOnce()
  })

  it('update() calls update on components and children with dt', () => {
    const obj = new GameObject('a', 'A')
    const comp = makeComp(); obj.addComponent(comp)
    obj.update(0.016)
    expect(comp.update).toHaveBeenCalledWith(0.016)
  })

  it('update() skips all work when active is false', () => {
    const obj = new GameObject('a', 'A')
    const comp = makeComp(); obj.addComponent(comp)
    obj.active = false
    obj.update(0.016)
    expect(comp.update).not.toHaveBeenCalled()
  })

  it('destroy() calls destroy on all components and children', () => {
    const parent = new GameObject('p', 'Parent')
    const child = new GameObject('c', 'Child')
    parent.addChild(child)
    const pc = makeComp(); parent.addComponent(pc)
    const cc = makeComp(); child.addComponent(cc)
    parent.destroy()
    expect(pc.destroy).toHaveBeenCalledOnce()
    expect(cc.destroy).toHaveBeenCalledOnce()
  })
})

// ─── Scene ───────────────────────────────────────────────────────────────────

const SCENE_DATA: SceneData = {
  name: 'test-scene',
  entities: [
    {
      id: 'ship',
      name: 'Ship',
      transform: { position: { x: 10, y: 20 }, rotation: 0, scale: { x: 1, y: 1 } },
      components: [],
      children: [
        {
          id: 'turret',
          name: 'Turret',
          transform: { position: { x: 0, y: -5 }, rotation: 0, scale: { x: 1, y: 1 } },
          components: [],
        },
      ],
    },
    {
      id: 'ore-0',
      name: 'Ore 0',
      transform: { position: { x: 100, y: 200 }, rotation: 0, scale: { x: 1, y: 1 } },
      components: [],
    },
  ],
}

describe('Scene.fromData', () => {
  it('creates one root per top-level entity', () => {
    const { scene } = Scene.fromData(SCENE_DATA)
    expect(scene.roots).toHaveLength(2)
  })

  it('hydrates transform on root entities', () => {
    const { scene } = Scene.fromData(SCENE_DATA)
    const ship = scene.roots[0]
    expect(ship.transform.position).toEqual({ x: 10, y: 20 })
  })

  it('nests children under correct parent', () => {
    const { scene } = Scene.fromData(SCENE_DATA)
    const ship = scene.roots[0]
    expect(ship.children).toHaveLength(1)
    expect(ship.children[0].id).toBe('turret')
    expect(ship.children[0].parent).toBe(ship)
  })

  it('entityData includes all entities (roots + children)', () => {
    const { entityData } = Scene.fromData(SCENE_DATA)
    expect(entityData).toHaveLength(3)
    expect(entityData.map(e => e.id)).toContain('turret')
  })
})

describe('Scene.find', () => {
  it('finds a root entity by id', () => {
    const { scene } = Scene.fromData(SCENE_DATA)
    expect(scene.find('ore-0')).not.toBeNull()
    expect(scene.find('ore-0')!.name).toBe('Ore 0')
  })

  it('finds a nested child entity by id', () => {
    const { scene } = Scene.fromData(SCENE_DATA)
    const turret = scene.find('turret')
    expect(turret).not.toBeNull()
    expect(turret!.id).toBe('turret')
  })

  it('returns null for an unknown id', () => {
    const { scene } = Scene.fromData(SCENE_DATA)
    expect(scene.find('does-not-exist')).toBeNull()
  })
})

describe('Scene.destroy', () => {
  it('empties roots after destroy', () => {
    const { scene } = Scene.fromData(SCENE_DATA)
    scene.destroy()
    expect(scene.roots).toHaveLength(0)
  })
})

// ─── GameLoop ─────────────────────────────────────────────────────────────────

function makeMockScene() {
  return { start: vi.fn(), update: vi.fn(), destroy: vi.fn(), roots: [] } as unknown as Scene
}

function makeMockApp() {
  return { renderer: { render: vi.fn() }, stage: {} } as unknown as Application
}

describe('GameLoop', () => {
  let rafCb: ((timestamp: number) => void) | null = null

  beforeEach(() => {
    rafCb = null
    vi.stubGlobal('requestAnimationFrame', vi.fn().mockImplementation((cb: (t: number) => void) => {
      rafCb = cb
      return 1
    }))
    vi.stubGlobal('cancelAnimationFrame', vi.fn())
    vi.stubGlobal('performance', { now: vi.fn().mockReturnValue(0) })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('calls scene.start() when loop starts', () => {
    const scene = makeMockScene()
    const loop = new GameLoop(scene, makeMockApp())
    loop.start()
    expect(scene.start).toHaveBeenCalledOnce()
    loop.stop()
  })

  it('does not call scene.start() twice if start() is called twice', () => {
    const scene = makeMockScene()
    const loop = new GameLoop(scene, makeMockApp())
    loop.start()
    loop.start()
    expect(scene.start).toHaveBeenCalledOnce()
    loop.stop()
  })

  it('calls scene.update with fixedTimestep after one frame tick', () => {
    const scene = makeMockScene()
    const app = makeMockApp()
    const loop = new GameLoop(scene, app, { fixedHz: 60 })
    loop.start()

    // Simulate one 16.67ms frame
    rafCb!(1000 / 60)

    expect(scene.update).toHaveBeenCalledWith(1 / 60)
    expect(app.renderer.render).toHaveBeenCalled()
    loop.stop()
  })

  it('clamps large dt to maxCatchUpSeconds', () => {
    const scene = makeMockScene()
    const loop = new GameLoop(scene, makeMockApp(), { fixedHz: 60, maxCatchUpSeconds: 0.05 })
    loop.start()

    // Simulate a 5-second freeze — should clamp to 0.05s = 3 fixed steps
    rafCb!(5000)

    const calls = (scene.update as ReturnType<typeof vi.fn>).mock.calls.length
    expect(calls).toBe(3) // 0.05 / (1/60) = 3
    loop.stop()
  })

  it('stop() prevents further rendering', () => {
    const scene = makeMockScene()
    const app = makeMockApp()
    const loop = new GameLoop(scene, app)
    loop.start()
    loop.stop()

    // Manually invoke tick after stop — should be a no-op
    rafCb!(100)
    expect(scene.update).not.toHaveBeenCalled()
    expect(app.renderer.render).not.toHaveBeenCalled()
  })
})

// ─── AssetManager ────────────────────────────────────────────────────────────

describe('AssetManager', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('resolves logical names from a loaded manifest', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ ship: '/game/assets/ships/ship.png' }),
    }))
    const assets = new AssetManager()
    await assets.loadManifest('/game/assets/manifest.json')
    expect(assets.resolve('ship')).toBe('/game/assets/ships/ship.png')
    expect(assets.resolve('missing')).toBeUndefined()
  })

  it('leaves manifest empty (everything resolves to undefined) if fetch fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network error')))
    const assets = new AssetManager()
    await assets.loadManifest('/game/assets/manifest.json')
    expect(assets.resolve('ship')).toBeUndefined()
  })

  it('loadTexture returns the placeholder when the name is not in the manifest', async () => {
    const assets = new AssetManager()
    const result = await assets.loadTexture('unknown')
    expect(result.isPlaceholder).toBe(true)
  })

  it('loadTextureByUrl returns the placeholder when Assets.load rejects', async () => {
    const { Assets } = await import('pixi.js')
    vi.mocked(Assets.load).mockRejectedValueOnce(new Error('404'))
    const assets = new AssetManager()
    const result = await assets.loadTextureByUrl('/missing.png')
    expect(result.isPlaceholder).toBe(true)
  })
})

// ─── SpriteRenderer ──────────────────────────────────────────────────────────

function makeContainer() {
  return { addChild: vi.fn() } as unknown as import('pixi.js').Container
}

function makeAssets() {
  return new AssetManager()
}

describe('SpriteRenderer', () => {
  it('fromData preserves textureUrl', () => {
    const sr = SpriteRenderer.fromData(
      { type: 'SpriteRenderer', textureUrl: '/parts/drill.png' },
      makeContainer(),
      makeAssets(),
    )
    expect(sr.toJSON()).toMatchObject({ type: 'SpriteRenderer', textureUrl: '/parts/drill.png' })
  })

  it('fromData uses 0.5 as default anchor', () => {
    const json = SpriteRenderer.fromData(
      { type: 'SpriteRenderer', textureUrl: '/x.png' },
      makeContainer(),
      makeAssets(),
    ).toJSON()
    expect(json).toMatchObject({ anchorX: 0.5, anchorY: 0.5 })
  })

  it('toJSON omits tint when not set', () => {
    const json = SpriteRenderer.fromData(
      { type: 'SpriteRenderer', textureUrl: '/x.png' },
      makeContainer(),
      makeAssets(),
    ).toJSON()
    expect(json).not.toHaveProperty('tint')
  })

  it('toJSON includes tint when set', () => {
    const json = SpriteRenderer.fromData(
      { type: 'SpriteRenderer', textureUrl: '/x.png', tint: 0xff0000 },
      makeContainer(),
      makeAssets(),
    ).toJSON()
    expect(json).toMatchObject({ tint: 0xff0000 })
  })

  it('toJSON preserves a logical sprite name', () => {
    const json = SpriteRenderer.fromData(
      { type: 'SpriteRenderer', sprite: 'ship' },
      makeContainer(),
      makeAssets(),
    ).toJSON()
    expect(json).toMatchObject({ sprite: 'ship' })
  })

  it('applies the magenta placeholder tint when the sprite name is unresolved', async () => {
    const sr = SpriteRenderer.fromData(
      { type: 'SpriteRenderer', sprite: 'unknown-sprite' },
      makeContainer(),
      makeAssets(),
    )
    const go = new GameObject('obj', 'Obj')
    go.addComponent(sr)
    go.start()
    await new Promise(resolve => setTimeout(resolve, 0))

    const created = vi.mocked((await import('pixi.js')).Sprite).mock.results.at(-1)!.value
    expect(created.tint).toBe(0xff00ff)
  })

  it('applies the configured tint when the texture loads successfully', async () => {
    const assets = makeAssets()
    const sr = SpriteRenderer.fromData(
      { type: 'SpriteRenderer', textureUrl: '/parts/drill.png', tint: 0x00ff00 },
      makeContainer(),
      assets,
    )
    const go = new GameObject('obj', 'Obj')
    go.addComponent(sr)
    go.start()
    await new Promise(resolve => setTimeout(resolve, 0))

    const created = vi.mocked((await import('pixi.js')).Sprite).mock.results.at(-1)!.value
    expect(created.tint).toBe(0x00ff00)
  })
})

// ─── wireSpriteRenderers ─────────────────────────────────────────────────────

describe('wireSpriteRenderers', () => {
  it('attaches a SpriteRenderer component to matching GameObjects', () => {
    const entityData: EntityData[] = [
      {
        id: 'ship',
        name: 'Ship',
        transform: { position: { x: 0, y: 0 }, rotation: 0, scale: { x: 1, y: 1 } },
        components: [{ type: 'SpriteRenderer', textureUrl: '/parts/drill.png' }],
      },
    ]
    const { scene } = Scene.fromData({ name: 'test', entities: entityData })
    const mockApp = { stage: {} } as unknown as Application

    wireSpriteRenderers(mockApp, entityData, scene, makeAssets())

    const ship = scene.find('ship')!
    const sr = ship.getComponent<SpriteRenderer>('SpriteRenderer')
    expect(sr).not.toBeNull()
    expect(sr!.toJSON()).toMatchObject({ type: 'SpriteRenderer', textureUrl: '/parts/drill.png' })
  })

  it('skips entities not present in the scene', () => {
    const entityData: EntityData[] = [
      {
        id: 'ghost',
        name: 'Ghost',
        transform: { position: { x: 0, y: 0 }, rotation: 0, scale: { x: 1, y: 1 } },
        components: [{ type: 'SpriteRenderer', textureUrl: '/x.png' }],
      },
    ]
    const { scene } = Scene.fromData({ name: 'test', entities: [] })
    const mockApp = { stage: {} } as unknown as Application

    // Should not throw
    expect(() => wireSpriteRenderers(mockApp, entityData, scene, makeAssets())).not.toThrow()
  })

  it('only wires SpriteRenderer components, ignores unknown types', () => {
    const entityData: EntityData[] = [
      {
        id: 'obj',
        name: 'Obj',
        transform: { position: { x: 0, y: 0 }, rotation: 0, scale: { x: 1, y: 1 } },
        components: [
          { type: 'ScriptBehaviour', scriptId: 'some-script' },
          { type: 'SpriteRenderer', textureUrl: '/x.png' },
        ],
      },
    ]
    const { scene } = Scene.fromData({ name: 'test', entities: entityData })
    const mockApp = { stage: {} } as unknown as Application

    wireSpriteRenderers(mockApp, entityData, scene, makeAssets())

    const obj = scene.find('obj')!
    expect(obj.components).toHaveLength(1)
    expect(obj.components[0].type).toBe('SpriteRenderer')
  })
})

// ─── ScriptBehaviour ──────────────────────────────────────────────────────────

describe('ScriptBehaviour', () => {
  class TestScript extends ScriptBehaviour {
    started = false
    updates: number[] = []
    destroyed = false

    start(): void { this.started = true }
    update(dt: number): void { this.updates.push(dt) }
    destroy(): void { this.destroyed = true }

    getUserId(): string | null { return this.context.auth.userId }
  }

  it('runs start/update/destroy lifecycle when attached to a GameObject', () => {
    const obj = new GameObject('a', 'A')
    const script = obj.addComponent(new TestScript(new RuntimeContext())) as TestScript

    obj.start()
    obj.update(0.016)
    obj.update(0.016)
    obj.destroy()

    expect(script.started).toBe(true)
    expect(script.updates).toEqual([0.016, 0.016])
    expect(script.destroyed).toBe(true)
  })

  it('exposes the mount-time RuntimeContext (auth) to subclasses', () => {
    const context = new RuntimeContext({ userId: 'user-123', token: 'tok' })
    const script = new TestScript(context)
    expect(script.getUserId()).toBe('user-123')
  })

  it('toJSON identifies the script by class name without reflection', () => {
    const script = new TestScript(new RuntimeContext())
    expect(script.toJSON()).toEqual({ type: 'ScriptBehaviour', scriptName: 'TestScript' })
  })

  it('registers via addComponent like any other Component (no decorators)', () => {
    const obj = new GameObject('a', 'A')
    const script = new TestScript(new RuntimeContext())
    obj.addComponent(script)
    expect(obj.getComponent<TestScript>('ScriptBehaviour')).toBe(script)
  })
})

// ─── InputManager ───────────────────────────────────────────────────────────

describe('screenToWorld', () => {
  it('maps client coordinates to world coordinates using the canvas rect and world size', () => {
    const rect = { left: 100, top: 50, width: 800, height: 450 }
    expect(screenToWorld(100, 50, rect, 800, 450)).toEqual({ x: 0, y: 0 })
    expect(screenToWorld(900, 500, rect, 800, 450)).toEqual({ x: 800, y: 450 })
    expect(screenToWorld(500, 275, rect, 800, 450)).toEqual({ x: 400, y: 225 })
  })

  it('scales when the canvas is rendered at a different size than the world', () => {
    // Canvas displayed at half the world resolution
    const rect = { left: 0, top: 0, width: 400, height: 225 }
    expect(screenToWorld(200, 112.5, rect, 800, 450)).toEqual({ x: 400, y: 225 })
  })

  it('returns origin if the rect has zero size (not yet laid out)', () => {
    const rect = { left: 0, top: 0, width: 0, height: 0 }
    expect(screenToWorld(50, 50, rect, 800, 450)).toEqual({ x: 0, y: 0 })
  })
})

describe('pointInBounds', () => {
  it('is true for a point inside a centered AABB', () => {
    expect(pointInBounds({ x: 100, y: 100 }, { x: 100, y: 100, width: 20, height: 20 })).toBe(true)
    expect(pointInBounds({ x: 108, y: 92 }, { x: 100, y: 100, width: 20, height: 20 })).toBe(true)
  })

  it('is false for a point outside a centered AABB', () => {
    expect(pointInBounds({ x: 120, y: 100 }, { x: 100, y: 100, width: 20, height: 20 })).toBe(false)
    expect(pointInBounds({ x: 100, y: 80 }, { x: 100, y: 100, width: 20, height: 20 })).toBe(false)
  })
})

describe('InputManager', () => {
  function makeCanvas(rect: Partial<DOMRect> = {}): HTMLCanvasElement {
    const canvas = document.createElement('canvas')
    vi.spyOn(canvas, 'getBoundingClientRect').mockReturnValue({
      left: 0, top: 0, width: 800, height: 450, right: 800, bottom: 450, x: 0, y: 0, toJSON: () => ({}),
      ...rect,
    } as DOMRect)
    return canvas
  }

  it('onAny receives every pointer event with converted world coordinates', () => {
    const canvas = makeCanvas()
    const input = new InputManager(canvas, 800, 450)
    const listener = vi.fn()
    input.onAny(listener)

    canvas.dispatchEvent(new MouseEvent('pointerdown', { clientX: 400, clientY: 225 }))

    expect(listener).toHaveBeenCalledWith(expect.objectContaining({
      type: 'pointerdown',
      world: { x: 400, y: 225 },
    }))
  })

  it('onEntity only fires when the event falls within the entity bounds', () => {
    const canvas = makeCanvas()
    const input = new InputManager(canvas, 800, 450)
    const hit = vi.fn()
    const miss = vi.fn()

    input.onEntity('a', () => ({ x: 400, y: 225, width: 50, height: 50 }), hit)
    input.onEntity('b', () => ({ x: 0, y: 0, width: 10, height: 10 }), miss)

    canvas.dispatchEvent(new MouseEvent('pointerdown', { clientX: 400, clientY: 225 }))

    expect(hit).toHaveBeenCalledOnce()
    expect(miss).not.toHaveBeenCalled()
  })

  it('setWorldSize updates the coordinate conversion for subsequent events', () => {
    const canvas = makeCanvas()
    const input = new InputManager(canvas, 800, 450)
    const listener = vi.fn()
    input.onAny(listener)

    input.setWorldSize(1600, 900)
    canvas.dispatchEvent(new MouseEvent('pointerdown', { clientX: 400, clientY: 225 }))

    expect(listener).toHaveBeenCalledWith(expect.objectContaining({ world: { x: 800, y: 450 } }))
  })

  it('destroy removes listeners and stops dispatching', () => {
    const canvas = makeCanvas()
    const input = new InputManager(canvas, 800, 450)
    const listener = vi.fn()
    input.onAny(listener)
    input.destroy()

    canvas.dispatchEvent(new MouseEvent('pointerdown', { clientX: 0, clientY: 0 }))
    expect(listener).not.toHaveBeenCalled()
  })
})
