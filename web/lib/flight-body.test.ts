import { describe, expect, it } from 'vitest'
import { flightBodyKind, flightBodySpec } from './flight-body'

const bennu = { id: 'bennu', name: '101955 Bennu', type: 'asteroid', archetype: 'C' }
const psyche = { id: 'psyche', name: '16 Psyche', type: 'asteroid', archetype: 'M' }
const eros = { id: 'eros', name: '433 Eros', type: 'asteroid', archetype: 'S' }
const europa = { id: 'europa', name: 'Europa', type: 'planet', archetype: 'icy' }
const jupiter = { id: 'jupiter', name: 'Jupiter', type: 'planet', archetype: 'gas-giant' }
const mars = { id: 'mars', name: 'Mars', type: 'planet', archetype: 'S' }

describe('flight body palettes', () => {
  it('gives each world family its own body', () => {
    expect(flightBodyKind(bennu, false)).toBe('asteroid')
    expect(flightBodyKind(europa, false)).toBe('ice')
    expect(flightBodyKind(jupiter, false)).toBe('bands')
    expect(flightBodyKind(mars, false)).toBe('rocky')
    expect(flightBodyKind({ id: 'earth-orbit-transit-telescope', name: 'Earth Orbit', type: 'planet' }, false)).toBe('earth')
    expect(flightBodyKind(bennu, true)).toBe('earth')
  })

  it('does not paint every asteroid with the same palette', () => {
    const carbon = flightBodySpec(bennu, false).palette.id
    const metal = flightBodySpec(psyche, false).palette.id
    const stony = flightBodySpec(eros, false).palette.id
    expect(carbon).toBe('bennu')
    expect(metal).toBe('metal')
    expect(stony).toBe('stony')
    expect(new Set([carbon, metal, stony]).size).toBe(3)
  })
})
