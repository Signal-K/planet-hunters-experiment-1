import { describe, expect, it } from 'vitest'
import { hash32, landscapeLayout, rng } from './landscape'
import { LASER_PALETTES } from './laserPalette'

describe('landscape', () => {
  it('hash and rng are stable (native mirrors these values)', () => {
    expect(hash32('mars')).toBe(hash32('mars'))
    expect(hash32('')).toBe(0x811c9dc5)
    const r = rng(42)
    const a = [r(), r(), r()]
    const r2 = rng(42)
    expect([r2(), r2(), r2()]).toEqual(a)
    a.forEach(v => { expect(v).toBeGreaterThanOrEqual(0); expect(v).toBeLessThan(1) })
  })

  it('every palette carries a landscape with no orange or green tint', () => {
    for (const p of Object.values(LASER_PALETTES)) {
      expect(p.landscape).toBeDefined()
      const n = parseInt(p.landscape!.tint.slice(1), 16)
      const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255]
      expect(g > r + 10 && g > b + 10).toBe(false) // not green
      expect(r - b > 60 && g > b + 20).toBe(false) // not orange
    }
  })

  it('varies by target and by palette, deterministic per pair', () => {
    const mars = LASER_PALETTES.mars.landscape
    const icy = LASER_PALETTES['icy-moon'].landscape
    expect(landscapeLayout(mars, 'mars')).toEqual(landscapeLayout(mars, 'mars'))
    expect(landscapeLayout(mars, 'mars')).not.toEqual(landscapeLayout(mars, 'venus'))
    expect(landscapeLayout(mars, 'x').tint).not.toBe(landscapeLayout(icy, 'x').tint)
  })

  it('deposit mix follows the weights', () => {
    const icy = LASER_PALETTES['icy-moon'].landscape
    const kinds = Array.from({ length: 40 }, (_, i) => landscapeLayout(icy, `t${i}`).deposits.map(d => d.kind)).flat()
    expect(kinds).not.toContain('iron')
    expect(kinds.filter(k => k === 'ice').length).toBeGreaterThan(kinds.length / 3)
  })
})
