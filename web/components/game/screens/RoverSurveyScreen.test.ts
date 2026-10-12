import { describe, expect, it } from 'vitest'
import { takeonBodyForTarget } from './RoverSurveyScreen'
import { outcropNear, SURVEY_OUTCROPS } from '@/lib/rover/terrain'

describe('RoverSurveyScreen host boundary', () => {
  it('maps Landnam mission targets to registered TakeOn bodies', () => {
    expect(takeonBodyForTarget({ id: 'bennu', type: 'asteroid' })).toBe('bennu')
    expect(takeonBodyForTarget({ id: 'itokawa', type: 'asteroid' })).toBe('ironrock')
    expect(takeonBodyForTarget({ id: 'unknown-asteroid', type: 'asteroid' })).toBe('ironrock')
    expect(takeonBodyForTarget({ id: 'unknown-planet', type: 'planet' })).toBe('mars')
  })

  it('places survey outcrops on the driveable ridge, without an extraction order', () => {
    expect(SURVEY_OUTCROPS.map(outcrop => outcrop.label)).toEqual(['OUTCROP A', 'OUTCROP B', 'OUTCROP C'])
    expect(SURVEY_OUTCROPS.map(outcrop => outcrop.mineral)).toEqual(['iron', 'copper', 'aluminium'])
    expect(outcropNear(SURVEY_OUTCROPS[1].x)?.id).toBe('outcrop-b')
  })
})
