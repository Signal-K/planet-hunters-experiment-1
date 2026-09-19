import { describe, expect, it } from 'vitest'
import { bloomProgress, lifePulse } from './TargetSphere'

describe('TargetSphere life animation', () => {
  it('only animates bloom on blooming bodies and shows a thriving body fully bloomed', () => {
    expect(bloomProgress('sterile', 1000)).toBe(0)
    expect(bloomProgress('dormant', 1000)).toBe(0)
    expect(bloomProgress('thriving', 1000)).toBe(1)
    const samples = [0, 2000, 4000, 6000].map(t => bloomProgress('blooming', t))
    for (const p of samples) {
      expect(p).toBeGreaterThanOrEqual(0.35)
      expect(p).toBeLessThanOrEqual(0.75)
    }
    expect(Math.max(...samples) - Math.min(...samples)).toBeGreaterThan(0.3)
  })

  it('keeps the shimmer subtle', () => {
    for (let t = 0; t < 2400; t += 100) {
      const k = lifePulse(t, 0.5)
      expect(k).toBeGreaterThanOrEqual(0.92)
      expect(k).toBeLessThanOrEqual(1.08)
    }
  })
})
