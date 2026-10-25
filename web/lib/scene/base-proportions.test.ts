import { describe, expect, it } from 'vitest'
import site from './base-site.json'

// SSL-679: one composition rule for the Base strip. Heights are in kit units (the sprite's camera frame).
describe('base proportions', () => {
  const heights = Object.entries(site.structures)
    .flatMap(([id, s]) => ('height' in s ? [[id, s.height as number] as const] : []))
    .sort((a, b) => b[1] - a[1])

  it('keeps the tallest structure within 2x of the next', () => {
    expect(heights.length).toBeGreaterThan(2)
    expect(heights[0][1] / heights[1][1]).toBeLessThanOrEqual(2)
  })
})
