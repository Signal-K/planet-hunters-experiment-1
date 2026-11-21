import { describe, expect, it } from 'vitest'
import { cargoFrom, fieldResources, fieldSeed, fieldStyleFor, miningMethodFor, orderLeft, playsInField } from './fieldMission'

describe('field mission helpers (KES-543)', () => {
  it('picks the look and real terrain by body', () => {
    expect(fieldStyleFor({ id: 'mars', type: 'planet' })).toBe('rust')
    expect(fieldStyleFor({ id: 'psyche', type: 'asteroid', archetype: 'M' })).toBe('metal')
    expect(fieldStyleFor({ id: 'bennu', type: 'asteroid', archetype: 'C' })).toBe('carbon')
  })

  it('plays mining contracts in the field, but not shower runs', () => {
    expect(playsInField({ id: 'generated-s1-starter-bulk-1', tag: 'STARTER' }, false)).toBe(true)
    expect(playsInField({ id: 'generated-s1-starter-bulk-1', tag: 'STARTER' }, true)).toBe(false)
    expect(playsInField({ id: 'x', tag: 'DELIVERY' }, false)).toBe(false)
  })

  it('takes the rover when a lander is fitted, the ship laser otherwise', () => {
    expect(miningMethodFor({ lander: 'lander-module-t1' })).toBe('rover')
    expect(miningMethodFor({})).toBe('orbit-laser')
  })

  it('lists ordered ore first and turns the hold into whole units', () => {
    expect(fieldResources({ platinum: 5 }, ['iron', 'platinum', 'nickel'])).toEqual(['platinum', 'iron', 'nickel'])
    const cargo = cargoFrom({ iron: 2 }, new Map([['iron', 1.99], ['platinum', 5.2]]))
    expect(cargo).toEqual({ iron: 3, platinum: 5 })
    expect(orderLeft({ platinum: 5 }, cargo).met).toBe(true)
    expect(fieldSeed('a', 'mars')).toBe(fieldSeed('a', 'mars'))
  })
})
