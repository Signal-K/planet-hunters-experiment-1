import { describe, expect, it } from 'vitest'
import { authoredScene, authoredSceneFile, resolveScene } from './SceneGraph'

describe('shared authored scene graph', () => {
  it('contains every authored scene and makes engine migration gaps explicit', () => {
    expect(authoredSceneFile.scenes).toHaveLength(27)
    expect(authoredSceneFile.scenes.filter(scene => scene.objects.length > 0).map(scene => scene.id)).toEqual(['hub', 'launchpad'])
    expect(authoredSceneFile.scenes.filter(scene => scene.objects.length === 0)).toHaveLength(25)
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
})
