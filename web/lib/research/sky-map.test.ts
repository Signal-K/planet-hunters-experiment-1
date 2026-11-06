import { describe, expect, it } from 'vitest'
import { TOTAL_FIELDS, fieldCentre, fieldId, landmarkNear, mappedCount, markMapped, mergeSkyMaps, raDelta, wrapRa, type SkyMap } from './sky-map'
import { setPointing, type ResearchPathChoice } from './paths'

describe('sky map', () => {
  it('cuts the whole sky into 288 fields and wraps right ascension', () => {
    expect(TOTAL_FIELDS).toBe(288)
    expect(wrapRa(-10)).toBe(350)
    expect(wrapRa(370)).toBe(10)
    expect(raDelta(350, 10)).toBe(-20)
    expect(fieldId({ ra: 359.9, dec: 89.9 })).toBe('23_11')
    expect(fieldId({ ra: 0, dec: -90 })).toBe('0_0')
  })

  it('every field has a centre that falls back in the same field', () => {
    for (let r = 0; r < 24; r++) for (let d = 0; d < 12; d++) {
      const id = `${r}_${d}`
      const c = fieldCentre(id)!
      expect(fieldId(c)).toBe(id)
    }
    expect(fieldCentre('99_1')).toBeNull()
  })

  it('keeps the first record of a field and merges maps by the earlier week', () => {
    const a = markMapped(undefined, { ra: 10, dec: 10 }, '2026-11-02', 'transit')
    expect(markMapped(a, { ra: 11, dec: 11 }, '2026-11-09', 'deep-space')).toBe(a)
    const merged = mergeSkyMaps(a, { [fieldId({ ra: 10, dec: 10 })]: { week: '2026-10-26', instrument: 'transit' }, '5_5': { week: '2026-11-02', instrument: 'transit' } })!
    expect(mappedCount(merged)).toBe(2)
    expect(merged[fieldId({ ra: 10, dec: 10 })].week).toBe('2026-10-26')
  })

  it('finds a landmark only when the aim is close to one', () => {
    expect(landmarkNear({ ra: 291, dec: 44 })?.id).toBe('cygnus')
    expect(landmarkNear({ ra: 150, dec: -30 })).toBeNull()
  })

  it('a weekly lock stores where the telescope looked and marks that field, once', () => {
    const player: { researchPath?: ResearchPathChoice; skyMap?: SkyMap } = { researchPath: { week: '2026-11-02', path: 'explorer' } }
    const locked = setPointing(player, 'transit', Date.parse('2026-11-04T12:00:00Z'), { ra: 120, dec: -40 })
    expect(locked.researchPath?.aim).toEqual({ ra: 120, dec: -40 })
    expect(Object.keys(locked.skyMap ?? {})).toEqual([fieldId({ ra: 120, dec: -40 })])
    expect(setPointing(locked, 'transit', Date.parse('2026-11-05T12:00:00Z'), { ra: 5, dec: 5 })).toBe(locked)
  })
})
