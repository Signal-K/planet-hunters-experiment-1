import { describe, expect, it } from 'vitest'
import { paletteById, paletteForTarget } from './laserPalette'

describe('laser palettes', () => {
  it('maps the approved worlds and keeps a giant planet only on the icy moon', () => {
    const bennu = paletteForTarget({ id: 'bennu', type: 'asteroid', archetype: 'C' })
    const mars = paletteForTarget({ id: 'mars', type: 'planet', archetype: 'S' })
    const europa = paletteForTarget({ id: 'europa', type: 'planet', archetype: 'icy' })
    expect(bennu.id).toBe('bennu')
    expect(bennu.starAlpha).toBeGreaterThan(0)
    expect(bennu.planet).toBeUndefined()
    expect(mars.id).toBe('mars')
    // SSL-518: Mars uses the dark dusk palette, so no daylight wash and no clouds.
    expect(mars.lightAlpha).toBe(0)
    expect(mars.clouds).toBe(false)
    expect(europa.id).toBe('icy-moon')
    expect(europa.planet?.bands.length).toBeGreaterThan(3)
    expect(europa.terrain).toBe('ice')
  })

  it('falls back by type so an unlisted world is a data choice, not a new renderer', () => {
    expect(paletteForTarget({ id: 'new-rock', type: 'asteroid' }).id).toBe('bennu')
    expect(paletteForTarget({ id: 'new-ice', type: 'planet', archetype: 'icy' }).id).toBe('icy-moon')
    expect(paletteForTarget({ id: 'new-world', type: 'planet', archetype: 'S' }).id).toBe('mars')
  })

  it('inks ore labels for the sky behind them', () => {
    expect(paletteForTarget({ id: 'bennu', type: 'asteroid' }).labelInk).toBe(0xffffff)
    expect(paletteForTarget({ id: 'europa', type: 'planet', archetype: 'icy' }).labelInk).toBe(0xffffff)
    // SSL-518: Mars' dusk horizon is dark, so its ore labels ink white.
    expect(paletteForTarget({ id: 'mars', type: 'planet' }).labelInk).toBe(0xffffff)
  })

  it('resolves a ?palette= id and rejects an unknown one', () => {
    expect(paletteById('icy-moon')?.id).toBe('icy-moon')
    expect(paletteById('mars')?.terrain).toBe('dunes')
    expect(paletteById('nope')).toBeNull()
    expect(paletteById(null)).toBeNull()
  })
})
