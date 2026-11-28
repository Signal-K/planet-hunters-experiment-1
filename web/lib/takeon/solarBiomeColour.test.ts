import { describe, expect, it } from 'vitest'
import { solarBiomeColour, gasGiantColour } from './solarBiomeColour'

const mars = ['#b0603a', '#754027', '#462619'] as const

describe('shared orbital and surface biome colours', () => {
  it('uses the body ground for red desert and a distinct colour for actual ice', () => {
    expect(solarBiomeColour('red-desert', mars)).toBe(mars[0])
    expect(solarBiomeColour('ice', mars)).not.toBe(mars[0])
  })
  it('distinguishes generated highlands from desert', () => {
    expect(solarBiomeColour('highlands', mars)).not.toBe(solarBiomeColour('red-desert', mars))
  })
})

it('gives Jupiter a localised red vortex and keeps Uranus visually quiet', () => {
  const rgb = (hex: string) => [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16))
  const spot = rgb(gasGiantColour('jupiter', -.38, .18)!)
  const belt = rgb(gasGiantColour('jupiter', -.38, 1)!)
  expect(spot[0] - spot[2]).toBeGreaterThan(belt[0] - belt[2])
  const quiet = rgb(gasGiantColour('uranus', 0, 0)!)
  const nearby = rgb(gasGiantColour('uranus', .1, 1)!)
  expect(Math.max(...quiet.map((value, i) => Math.abs(value - nearby[i])))).toBeLessThan(4)
  expect(gasGiantColour('mars', 0, 0)).toBeNull()
})
