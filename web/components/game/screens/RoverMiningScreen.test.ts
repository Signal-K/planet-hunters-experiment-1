import { describe, expect, it } from 'vitest'
import { landnamCargoFromTakeon, takeonBodyForTarget } from './RoverMiningScreen'

describe('RoverMiningScreen TakeOn host boundary', () => {
  it('maps Landnam mission targets to registered TakeOn bodies', () => {
    expect(takeonBodyForTarget({ id: 'bennu', type: 'asteroid' })).toBe('bennu')
    expect(takeonBodyForTarget({ id: 'itokawa', type: 'asteroid' })).toBe('ironrock')
    expect(takeonBodyForTarget({ id: 'unknown-asteroid', type: 'asteroid' })).toBe('ironrock')
  })

  it('keeps only required Landnam minerals when translating the TakeOn hold', () => {
    expect(landnamCargoFromTakeon({ iron: 4, stone: 2, titanium: 3 }, { iron: 3, carbon: 2 }))
      .toEqual({ iron: 3, carbon: 2 })
  })
})
