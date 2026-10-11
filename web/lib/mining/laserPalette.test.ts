import { describe, expect, it } from 'vitest'
import { paletteForTarget } from './laserPalette'

describe('laser palettes', () => {
  it('maps the approved worlds and keeps a giant planet only on the icy moon', () => {
    const bennu = paletteForTarget({ id: 'bennu', type: 'asteroid', archetype: 'C' })
    const mars = paletteForTarget({ id: 'mars', type: 'planet', archetype: 'S' })
    const europa = paletteForTarget({ id: 'europa', type: 'planet', archetype: 'icy' })
    expect(bennu.id).toBe('bennu')
    expect(bennu.starAlpha).toBeGreaterThan(0)
    expect(bennu.planet).toBeUndefined()
    expect(mars.id).toBe('mars')
    expect(mars.lightAlpha).toBeGreaterThan(0)
    expect(mars.clouds).toBe(true)
    expect(europa.id).toBe('icy-moon')
    expect(europa.planet?.bands.length).toBeGreaterThan(3)
    expect(europa.terrain).toBe('ice')
  })

  it('falls back by type so an unlisted world is a data choice, not a new renderer', () => {
    expect(paletteForTarget({ id: 'new-rock', type: 'asteroid' }).id).toBe('bennu')
    expect(paletteForTarget({ id: 'new-ice', type: 'planet', archetype: 'icy' }).id).toBe('icy-moon')
    expect(paletteForTarget({ id: 'new-world', type: 'planet', archetype: 'S' }).id).toBe('mars')
  })
})
