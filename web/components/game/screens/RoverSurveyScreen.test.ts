import { describe, expect, it } from 'vitest'
import { surveyRoverSpec, takeonBodyForTarget } from './RoverSurveyScreen'

describe('RoverSurveyScreen host boundary', () => {
  it('maps Landnam mission targets to registered TakeOn bodies', () => {
    expect(takeonBodyForTarget({ id: 'bennu', type: 'asteroid' })).toBe('bennu')
    expect(takeonBodyForTarget({ id: 'itokawa', type: 'asteroid' })).toBe('ironrock')
    expect(takeonBodyForTarget({ id: 'unknown-asteroid', type: 'asteroid' })).toBe('ironrock')
    expect(takeonBodyForTarget({ id: 'unknown-planet', type: 'planet' })).toBe('mars')
  })

  it('fits the catalog deep radar on the stock scout so Takeon scan can run', () => {
    expect(surveyRoverSpec().modules).toEqual(['tool-scoop', 'scan-deep'])
    expect(surveyRoverSpec().chassis).toBe('chassis-scout')
    expect(surveyRoverSpec().wheels).toBe('wheels-rocker')
  })
})
