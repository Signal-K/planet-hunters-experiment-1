import { describe, expect, it } from 'vitest'
import {
  PROGRAMMES,
  PROGRAMME_STAGES,
  programmeById,
  programmesForChannel,
  programmeTemplate,
  validateProgramme,
} from './programmes'

describe('programme registry', () => {
  it('every registered programme passes the standard', () => {
    for (const programme of PROGRAMMES) {
      const result = validateProgramme(programme)
      expect(result.problems, programme.id).toEqual([])
      expect(result.ok).toBe(true)
    }
  })

  it('ids are unique and stages are ordered', () => {
    const ids = PROGRAMMES.map(p => p.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const p of PROGRAMMES) {
      const idx = p.stages.map(s => PROGRAMME_STAGES.indexOf(s))
      expect([...idx].sort((a, b) => a - b)).toEqual(idx)
    }
  })

  it('citizen science never pays francs and only the biosphere tier is speculative', () => {
    for (const p of PROGRAMMES) {
      if (p.kind === 'citizen-science') {
        expect(p.reward.francs).toBe(false)
        expect(p.framing).toBe('none')
      }
      if (p.framing === 'speculative') expect(p.reward.progression).toBe('biosphere')
    }
  })

  it('the live TESS and NEOCP feeds are instrument-owned and peer-reviewed', () => {
    const tess = programmeById('tess-transit-search')!
    expect(tess.source).toEqual({ kind: 'instrument', instrumentId: 'transit-telescope' })
    expect(tess.consensus).toEqual({ agreeing: 5, reviewer: 'peers' })
    expect(programmesForChannel('discoveries').map(p => p.id)).toContain('neocp-asteroid-confirmation')
  })
})

describe('template + validation', () => {
  it('the blank template cannot ship', () => {
    const result = validateProgramme(programmeTemplate('new-thing', 'citizen-science'))
    expect(result.ok).toBe(false)
    expect(result.problems.some(p => /question/.test(p))).toBe(true)
    expect(result.problems.some(p => /recipient/.test(p))).toBe(true)
  })

  it('rejects a paid or speculative citizen-science programme', () => {
    const base = programmeById('tess-transit-search')!
    expect(validateProgramme({ ...base, reward: { francs: 500 } }).problems.some(p => /francs/.test(p))).toBe(true)
    expect(validateProgramme({ ...base, framing: 'speculative' }).problems.some(p => /fictional/.test(p))).toBe(true)
    expect(validateProgramme({ ...base, stages: ['contribute', 'observe', 'shared'] }).problems.some(p => /follow/.test(p))).toBe(true)
  })
})
