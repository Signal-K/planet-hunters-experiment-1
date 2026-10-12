import { describe, expect, it } from 'vitest'
import { createRover, elevation, outcropNear, slopeAt, stepRover, SURVEY_OUTCROPS } from './terrain'

describe('rover heightmap', () => {
  it('keeps the opening hill climbable and the cliff too steep', () => {
    expect(Math.abs(slopeAt(480))).toBeLessThan(0.72)
    expect(Math.abs(slopeAt(2124))).toBeGreaterThan(0.72)
    expect(elevation(1480)).toBeLessThan(Math.min(elevation(1270), elevation(1690)) - 30)
  })

  it('drives up a hill and the wheels stay on the ground', () => {
    let pose = createRover()
    const startY = pose.y
    for (let i = 0; i < 180; i += 1) pose = stepRover(pose, 1, 1 / 60)
    expect(pose.x).toBeGreaterThan(450)
    expect(pose.y).toBeLessThan(startY - 30)
    expect(pose.grounded).toBe(true)
    const ground = -elevation(pose.x)
    expect(Math.abs(pose.y - ground)).toBeLessThan(WHEEL_SLOP)
  })

  it('cannot climb the cliff and slides back down', () => {
    let pose = createRover()
    pose.x = 2060
    pose.y = -elevation(2060)
    pose.vx = 40
    for (let i = 0; i < 150; i += 1) pose = stepRover(pose, 1, 1 / 60)
    expect(pose.x).toBeLessThan(2120)
    expect(elevation(pose.x)).toBeLessThan(elevation(2140) - 40)
  })

  it('logs an outcrop only from beside it', () => {
    expect(outcropNear(SURVEY_OUTCROPS[0].x)).toMatchObject({ id: 'outcrop-a' })
    expect(outcropNear(SURVEY_OUTCROPS[0].x + 200)).toBeNull()
  })
})

const WHEEL_SLOP = 8
