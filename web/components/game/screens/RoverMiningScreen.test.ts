import { describe, expect, it } from 'vitest'
import { drillFinding, exposedOreMarkers, landnamCargoFromTakeon, takeonBodyForTarget } from './RoverMiningScreen'

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

  it('keeps exposed ore in bounds and guarantees a mine site by drill three', () => {
    const [firstMarker] = exposedOreMarkers({ x: 0, y: 31 })
    expect(firstMarker).toMatchObject({ x: 3, y: 30, label: 'OUTCROP A' })
    expect([1, 2, 3].map(attempt => drillFinding(attempt, firstMarker).kind))
      .toEqual(['trace', 'vein', 'mine-site'])
  })
})
