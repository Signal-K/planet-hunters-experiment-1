import { describe, expect, it } from 'vitest'
import { exposedOutcrops, takeonBodyForTarget } from './RoverSurveyScreen'

describe('RoverSurveyScreen TakeOn host boundary', () => {
  it('maps Landnam mission targets to registered TakeOn bodies', () => {
    expect(takeonBodyForTarget({ id: 'bennu', type: 'asteroid' })).toBe('bennu')
    expect(takeonBodyForTarget({ id: 'itokawa', type: 'asteroid' })).toBe('ironrock')
    expect(takeonBodyForTarget({ id: 'unknown-asteroid', type: 'asteroid' })).toBe('ironrock')
    expect(takeonBodyForTarget({ id: 'unknown-planet', type: 'planet' })).toBe('mars')
  })

  it('places survey outcrops to observe, without an extraction order', () => {
    const outcrops = exposedOutcrops({ x: 0, y: 31 })
    expect(outcrops.map(outcrop => outcrop.label)).toEqual(['OUTCROP A', 'OUTCROP B', 'OUTCROP C'])
    expect(outcrops.map(outcrop => outcrop.mineral)).toEqual(['iron', 'copper', 'aluminium'])
    expect(new Set(outcrops.map(outcrop => outcrop.id)).size).toBe(3)
  })
})
