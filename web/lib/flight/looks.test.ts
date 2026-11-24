import { describe, expect, it } from 'vitest'
import { DEFAULT_LIVERY, PAD_ROCKET_PROFILE, flightCraftLook, flightDestinationLook, seedFromText } from './looks'

const body = (id: string, type: string, archetype?: string) => ({ id, name: id, type, archetype })
const luminance = (hex: string) => {
  const n = parseInt(hex.slice(1), 16)
  return 0.3 * ((n >> 16) & 255) + 0.59 * ((n >> 8) & 255) + 0.11 * (n & 255)
}

describe('flight looks', () => {
  it('draws Earth on the way home and the body itself on the way out', () => {
    expect(flightDestinationLook(body('eros', 'asteroid', 'S'), true).kind).toBe('ocean')
    expect(flightDestinationLook(body('eros', 'asteroid', 'S'), false).kind).toBe('asteroid')
    expect(flightDestinationLook(body('mars', 'planet'), false).kind).toBe('rocky')
    expect(flightDestinationLook(body('europa', 'planet', 'icy'), false).kind).toBe('ice')
    expect(flightDestinationLook(body('saturn', 'planet', 'gas-giant'), false).rings).toBeTruthy()
  })

  it('gives a body the same globe on every flight, and different bodies different ones', () => {
    const eros = flightDestinationLook(body('eros', 'asteroid', 'S'), false)
    expect(flightDestinationLook(body('eros', 'asteroid', 'S'), false)).toEqual(eros)
    expect(flightDestinationLook(body('bennu', 'asteroid', 'C'), false).seed).not.toBe(eros.seed)
    expect(seedFromText('eros')).toBe(seedFromText('eros'))
  })

  it('lifts a dark asteroid so its sunlit side reads against space', () => {
    const look = flightDestinationLook(body('bennu', 'asteroid', 'C'), false)
    expect(Math.max(...look.colors.map(luminance))).toBeGreaterThan(150)
  })

  it('revolves the launchpad rocket, so the rocket in space is the one the player built', () => {
    const craft = flightCraftLook(null)
    expect(craft.sections).toHaveLength(PAD_ROCKET_PROFILE.length)
    expect(craft.sections.reduce((n, s) => n + s.length, 0)).toBeCloseTo(2.1)
    expect(Math.max(...craft.sections.map(s => s.r0))).toBeLessThan(0.16)
    expect(craft.sections.filter(s => s.color === DEFAULT_LIVERY.hull).length).toBeGreaterThan(8)
    expect(craft.boosters).toMatchObject({ count: 2, color: DEFAULT_LIVERY.hull })
    expect(craft.fins).toBeUndefined()
    const painted = flightCraftLook(null, { hull: '#222222', trim: '#ff0000' })
    expect(painted.sections.some(s => s.color === '#ff0000')).toBe(true)
    expect(painted.sections.some(s => s.color === DEFAULT_LIVERY.hull)).toBe(false)
  })
})
