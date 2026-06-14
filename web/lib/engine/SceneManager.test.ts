// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

vi.mock('pixi.js', () => ({
  Graphics: vi.fn().mockImplementation(function (this: Record<string, unknown>) {
    this.alpha = 0
    this.rect = vi.fn().mockReturnThis()
    this.fill = vi.fn().mockReturnThis()
    this.destroy = vi.fn()
  }),
}))

import type { Application } from 'pixi.js'
import { SceneManager } from './SceneManager'
import type { SceneData } from './types'

function makeApp() {
  return {
    screen: { width: 600, height: 300 },
    renderer: { render: vi.fn() },
    stage: { addChild: vi.fn() },
  } as unknown as Application
}

const SCENE_A: SceneData = { name: 'a', entities: [{ id: 'a1', name: 'A1', transform: { position: { x: 0, y: 0 }, rotation: 0, scale: { x: 1, y: 1 } }, components: [] }] }
const SCENE_B: SceneData = { name: 'b', entities: [{ id: 'b1', name: 'B1', transform: { position: { x: 0, y: 0 }, rotation: 0, scale: { x: 1, y: 1 } }, components: [] }] }

function makeFetchScene() {
  const scenes: Record<string, SceneData> = {
    '/scenes/a.json': SCENE_A,
    '/scenes/b.json': SCENE_B,
  }
  return vi.fn(async (url: string) => {
    const data = scenes[url]
    if (!data) throw new Error(`not found: ${url}`)
    return data
  })
}

describe('SceneManager', () => {
  beforeEach(() => {
    let now = 0
    vi.stubGlobal('performance', { now: vi.fn(() => now) })
    vi.stubGlobal('requestAnimationFrame', vi.fn().mockImplementation((cb: (t: number) => void) => {
      now += 100
      // Defer to a microtask so SceneManager's fade loop and GameLoop's
      // continuous tick loop don't recurse synchronously into a stack overflow.
      Promise.resolve().then(() => cb(now))
      return 1
    }))
    vi.stubGlobal('cancelAnimationFrame', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('throws when loading an unregistered scene name', async () => {
    const manager = new SceneManager({ app: makeApp(), registry: {}, fetchScene: makeFetchScene() })
    await expect(manager.load('missing')).rejects.toThrow(/no scene registered/)
  })

  it('has() reflects the registry', () => {
    const manager = new SceneManager({ app: makeApp(), registry: { a: '/scenes/a.json' }, fetchScene: makeFetchScene() })
    expect(manager.has('a')).toBe(true)
    expect(manager.has('b')).toBe(false)
    manager.register('b', '/scenes/b.json')
    expect(manager.has('b')).toBe(true)
  })

  it('loads a scene and sets current/currentName', async () => {
    const manager = new SceneManager({ app: makeApp(), registry: { a: '/scenes/a.json' }, fetchScene: makeFetchScene() })
    const scene = await manager.load('a')
    expect(scene.name).toBe('a')
    expect(manager.current).toBe(scene)
    expect(manager.currentName).toBe('a')
    expect(manager.currentEntityData).toHaveLength(1)
  })

  it('fires onExit on the outgoing scene and onEnter on the incoming scene', async () => {
    const onExitA = vi.fn()
    const onEnterB = vi.fn()
    const manager = new SceneManager({
      app: makeApp(),
      registry: { a: '/scenes/a.json', b: '/scenes/b.json' },
      fetchScene: makeFetchScene(),
    })
    manager.registerLifecycle('a', { onExit: onExitA })
    manager.registerLifecycle('b', { onEnter: onEnterB })

    await manager.load('a')
    await manager.load('b')

    expect(onExitA).toHaveBeenCalledOnce()
    expect(onEnterB).toHaveBeenCalledOnce()
    expect(manager.currentName).toBe('b')
  })

  it('calls the wirer with the app, entity data, and scene', async () => {
    const wire = vi.fn()
    const manager = new SceneManager({ app: makeApp(), registry: { a: '/scenes/a.json' }, wire, fetchScene: makeFetchScene() })
    const scene = await manager.load('a')
    expect(wire).toHaveBeenCalledWith(expect.anything(), expect.any(Array), scene)
  })

  it('supports a cut transition with no fade animation', async () => {
    const app = makeApp()
    const manager = new SceneManager({ app, registry: { a: '/scenes/a.json', b: '/scenes/b.json' }, fetchScene: makeFetchScene() })
    await manager.load('a', { transition: 'cut' })
    await manager.load('b', { transition: 'cut' })
    expect(manager.currentName).toBe('b')
  })

  it('destroys the current scene and stops the loop', async () => {
    const manager = new SceneManager({ app: makeApp(), registry: { a: '/scenes/a.json' }, fetchScene: makeFetchScene() })
    const scene = await manager.load('a')
    const destroySpy = vi.spyOn(scene, 'destroy')
    manager.destroy()
    expect(destroySpy).toHaveBeenCalled()
    expect(manager.current).toBeNull()
  })

  it('rejects a load() call while a transition is already in progress', async () => {
    const manager = new SceneManager({
      app: makeApp(),
      registry: { a: '/scenes/a.json', b: '/scenes/b.json' },
      fetchScene: makeFetchScene(),
      transitionDuration: 0,
    })
    const first = manager.load('a')
    await expect(manager.load('b')).rejects.toThrow(/already in progress/)
    await first
  })
})
