import { describe, expect, it } from 'vitest'
import { authoredScene, authoredSceneFile, resolvePrefab, resolveScene } from './SceneGraph'
import { GAME_SCREENS } from '../game-screens'

describe('shared authored scene graph', () => {
  it('contains every authored scene and makes engine migration gaps explicit', () => {
    expect(authoredSceneFile.scenes).toHaveLength(25)
    expect(authoredSceneFile.scenes.map(scene => scene.route).sort()).toEqual([...GAME_SCREENS].sort())
    for (const scene of authoredSceneFile.scenes) {
      expect(scene.objects.length, scene.id).toBeGreaterThan(0)
      for (const object of scene.objects) {
        expect(object.mechanics?.length, `${scene.id}/${object.id}`).toBeGreaterThan(0)
        for (const id of object.mechanics ?? []) expect(authoredSceneFile.mechanics.some(mechanic => mechanic.id === id)).toBe(true)
      }
    }
    expect(authoredSceneFile.scenes.flatMap(scene => scene.objects).filter(object => object.layout === 'shared')).toHaveLength(5)
  })

  it.each([
    [390, 844],
    [926, 428],
    [1440, 900],
  ])('resolves launchpad slots and explicit object frames at %ix%i', (width, height) => {
    const scene = authoredScene('launchpad')!
    const objects = resolveScene(scene, width, height)
    const launch = objects.find(object => object.id === 'launch-action')!
    expect(launch.frame).toEqual({ x: width * 0.62, y: height * 0.82, w: width * 0.36, h: height * 0.14 })
    expect(launch.layer).toBe('controls')
    const back = objects.find(object => object.id === 'back-control')!
    expect(back.frame).toEqual({ x: width * 0.03, y: height * 0.025, w: width * 0.22, h: height * 0.07 })
    expect(objects.find(object => object.id === 'service-tower')).toMatchObject({ depth: 2, layer: 'world' })
  })

  it('resolves against the safe area rather than the outer viewport', () => {
    const scene = authoredScene('launchpad')!
    const launch = resolveScene(scene, 390, 844, { top: 47, bottom: 34 }).find(object => object.id === 'launch-action')!
    expect(launch.frame.x).toBeCloseTo(241.8)
    expect(launch.frame.y).toBeCloseTo(672.66)
    expect(launch.frame.w).toBeCloseTo(140.4)
    expect(launch.frame.h).toBeCloseTo(106.82)
  })

  it('resolves the real prefab in its host bounds and keeps the rocket on the mount', () => {
    const parts = resolvePrefab(authoredScene('launchpad')!, 'launchpad-complex', 1104, 865)
    const rocket = parts.find(object => object.id === 'staged-rocket')!
    expect(rocket.frame.x + rocket.frame.w / 2).toBeCloseTo(359.904)
    expect(rocket.frame.y + rocket.frame.h).toBeCloseTo(785.42)
    expect(parts.find(object => object.id === 'launch-control')!.action).toBe('choose-mission')
    expect(parts.some(object => object.id === 'mission-selector')).toBe(false)
  })

  it('uses the parent transform only when explicitly requested, independent of object order', () => {
    const objects = resolveScene({ id: 'test', type: 'base', route: 'hub', surface: 'dom', objects: [
      { id: 'child', kind: 'vehicle', parent: 'root', space: 'parent', rect: { x: 0.5, y: 0.5, w: 0.5, h: 0.5 } },
      { id: 'root', kind: 'group', rect: { x: 0.1, y: 0.2, w: 0.4, h: 0.6 } },
    ] }, 1000, 500)
    expect(objects[0].frame).toEqual({ x: 300, y: 250, w: 200, h: 150 })
  })
})
