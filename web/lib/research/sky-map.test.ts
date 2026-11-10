import { describe, expect, it } from 'vitest'
import { TOTAL_FIELDS, fieldCentre, fieldId, landmarkNear, mappedCount, markMapped, mergeSkyMaps, raDelta, wrapRa, type SkyMap } from './sky-map'
import { pointTelescope, saturnSectorName, telescopesNeedingPointing, type TelescopeAim } from './paths'

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

  it('a weekly lock stores where the telescope looked and marks that field, once per telescope', () => {
    const player: { telescopeAim?: TelescopeAim; skyMap?: SkyMap } = {}
    const locked = pointTelescope(player, 'transit', Date.parse('2026-11-04T12:00:00Z'), { ra: 120, dec: -40 })
    expect(locked.telescopeAim?.transit?.aim).toEqual({ ra: 120, dec: -40 })
    expect(Object.keys(locked.skyMap ?? {})).toEqual([fieldId({ ra: 120, dec: -40 })])
    expect(pointTelescope(locked, 'transit', Date.parse('2026-11-05T12:00:00Z'), { ra: 5, dec: 5 })).toBe(locked)
    // Another telescope can still be pointed the same week, and the next Monday asks again.
    expect(pointTelescope(locked, 'deep-space', Date.parse('2026-11-05T12:00:00Z'), { ra: 5, dec: 5 })).not.toBe(locked)
    expect(pointTelescope(locked, 'transit', Date.parse('2026-11-10T12:00:00Z'), { ra: 5, dec: 5 })).not.toBe(locked)
  })

  it('a Saturn lock keeps the sector for the week and names it only that week', () => {
    const now = Date.parse('2026-11-04T12:00:00Z')
    const locked = pointTelescope<{ telescopeAim?: TelescopeAim }>({}, 'saturn', now, undefined, 'band')
    expect(locked.telescopeAim?.saturn?.sector).toBe('band')
    expect(saturnSectorName(locked, now)).toBe('Storm band')
    expect(saturnSectorName(locked, Date.parse('2026-11-10T12:00:00Z'))).toBeNull()
    expect(saturnSectorName({}, now)).toBeNull()
  })

  it('asks for a telescope to be pointed only when it is online and not yet pointed this week', () => {
    const online = { freeOperations: true, transitSatelliteLaunchedAt: 1 }
    const now = Date.parse('2026-11-04T12:00:00Z')
    expect(telescopesNeedingPointing({}, now)).toEqual([])
    expect(telescopesNeedingPointing(online, now)).toEqual(['transit'])
    expect(telescopesNeedingPointing(pointTelescope<typeof online & { telescopeAim?: TelescopeAim }>(online, 'transit', now, { ra: 1, dec: 1 }), now)).toEqual([])
    expect(telescopesNeedingPointing(pointTelescope<typeof online & { telescopeAim?: TelescopeAim }>(online, 'transit', now, { ra: 1, dec: 1 }), Date.parse('2026-11-10T12:00:00Z'))).toEqual(['transit'])
  })
})
