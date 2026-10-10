import { describe, it, expect } from 'vitest'
import { hitStopSeconds, stepHitStop, pickupPosition, recoilOffset, easeInOutCubic } from './miningJuice'

describe('hit-stop', () => {
  it('collects freeze longer than plain hits', () => {
    expect(hitStopSeconds('collect', false)).toBeGreaterThan(hitStopSeconds('hit', false))
  })
  it('is disabled under reduced motion', () => {
    expect(hitStopSeconds('collect', true)).toBe(0)
  })
  it('holds the sim at dt 0 while frozen, then resumes with the leftover', () => {
    let s = stepHitStop(0.09, 0.016)
    expect(s.simDt).toBe(0)
    expect(s.remaining).toBeCloseTo(0.074)
    s = stepHitStop(0.01, 0.05)
    expect(s.remaining).toBe(0)
    expect(s.simDt).toBeCloseTo(0.04)
  })
  it('is a no-op when not frozen', () => {
    expect(stepHitStop(0, 0.016)).toEqual({ simDt: 0.016, remaining: 0 })
  })
})

describe('pickup chip', () => {
  const a = { x: 100, y: 200 }, b = { x: 20, y: 40 }
  it('starts at the ore and ends at the ship', () => {
    expect(pickupPosition(a, b, 0)).toEqual(a)
    expect(pickupPosition(a, b, 1)).toEqual(b)
  })
  it('pops upward before travelling', () => {
    expect(pickupPosition(a, a, 0.3).y).toBeLessThan(a.y)
  })
  it('eases monotonically', () => {
    expect(easeInOutCubic(0.25)).toBeLessThan(easeInOutCubic(0.5))
    expect(easeInOutCubic(-1)).toBe(0)
    expect(easeInOutCubic(2)).toBe(1)
  })
})

describe('recoil', () => {
  it('kicks up immediately and settles to zero', () => {
    expect(recoilOffset(0)).toBeLessThan(0)
    expect(recoilOffset(0.18)).toBe(0)
    expect(recoilOffset(-0.1)).toBe(0)
  })
})
