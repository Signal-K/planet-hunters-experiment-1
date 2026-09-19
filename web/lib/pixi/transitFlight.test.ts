import { describe, expect, it } from 'vitest'
import { transitOriginEarthRadius, transitRocketScreenPos } from './transitFlight'

describe('transit outbound Earth recede', () => {
  it('fills the lower frame at the start of an outbound leg, then shrinks away', () => {
    const start = transitOriginEarthRadius(0, 640, 'planet')
    const mid = transitOriginEarthRadius(20, 640, 'planet')
    const gone = transitOriginEarthRadius(50, 640, 'planet')
    expect(start).toBeGreaterThan(640 * 0.5)
    expect(mid).toBeGreaterThan(0)
    expect(mid).toBeLessThan(start)
    expect(gone).toBe(0)
  })

  it('does not draw a second Earth when Earth itself is the destination', () => {
    expect(transitOriginEarthRadius(0, 640, 'earth')).toBe(0)
    expect(transitOriginEarthRadius(40, 640, 'earth')).toBe(0)
  })
})

describe('transit rocket screen position', () => {
  it('matches the DOM overlay percentage used by TransitCanvas', () => {
    expect(transitRocketScreenPos(0, 800, 500)).toEqual({ x: 400, y: 500 * 0.88 })
    expect(transitRocketScreenPos(100, 800, 500).y).toBe(500 * 0.46)
  })
})
