import { describe, expect, it } from 'vitest'
import { sceneTransitionDurationMs, transitionKind } from './scene-transition'

describe('scene transitions', () => {
  it('stays inside the 250–450ms window', () => {
    const ms = sceneTransitionDurationMs()
    expect(ms).toBeGreaterThanOrEqual(250)
    expect(ms).toBeLessThanOrEqual(450)
  })

  it('climbs from the launch cinematic into transit', () => {
    expect(transitionKind('launch', 'transit')).toBe('climb')
  })

  it('arrives from transit into the surface scenes', () => {
    expect(transitionKind('transit', 'mining')).toBe('arrival')
    expect(transitionKind('transit', 'rover-mining')).toBe('arrival')
    expect(transitionKind('transit', 'landing')).toBe('arrival')
    expect(transitionKind('transit', 'delivery')).toBe('arrival')
    expect(transitionKind('landing', 'mining')).toBe('arrival')
    expect(transitionKind('landing', 'rover-mining')).toBe('arrival')
  })

  it('descends into debrief from the return leg', () => {
    expect(transitionKind('transit', 'debrief')).toBe('debrief')
    expect(transitionKind('landing', 'debrief')).toBe('debrief')
  })

  it('fades every other hop, including leaving a surface for the return burn', () => {
    expect(transitionKind('fab', 'launch')).toBe('fade')
    expect(transitionKind('hub', 'missions')).toBe('fade')
    expect(transitionKind('missions', 'targets')).toBe('fade')
    expect(transitionKind('targets', 'rocket-buy')).toBe('fade')
    expect(transitionKind('rocket-buy', 'fab')).toBe('fade')
    expect(transitionKind('mining', 'transit')).toBe('fade')
    expect(transitionKind('debrief', 'hub')).toBe('fade')
    expect(transitionKind('hub', 'transit')).toBe('fade')
    expect(transitionKind('intro', 'build')).toBe('fade')
  })
})
