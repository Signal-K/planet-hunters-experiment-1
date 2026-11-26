import { describe, expect, it } from 'vitest'
import { solarBiomeColour } from './solarBiomeColour'

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
