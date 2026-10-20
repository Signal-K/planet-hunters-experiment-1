import { describe, expect, it } from 'vitest'
import {
  catchesForNight,
  holdHasRoom,
  mergeNightCatches,
  orionidsNightKey,
  recordFragmentCatch,
  sanitizeNightCatches,
} from './night-catches'

const local = (m: number, d: number, h: number) => new Date(2026, m - 1, d, h, 0, 0, 0).getTime()

describe('Orionids night catches', () => {
  it('treats the peak evening and the 02:00 fireball as one night', () => {
    expect(orionidsNightKey(local(10, 21, 18))).toBe('2026-10-21')
    expect(orionidsNightKey(local(10, 22, 2))).toBe('2026-10-21')
    expect(orionidsNightKey(local(10, 22, 6))).toBe('2026-10-22')
  })

  it('counts catches across the night and starts again the next night', () => {
    const first = recordFragmentCatch(null, local(10, 21, 22))
    const second = recordFragmentCatch(first, local(10, 22, 3))
    expect(second).toEqual({ night: '2026-10-21', count: 2 })
    expect(catchesForNight(second, local(10, 22, 4))).toBe(2)
    expect(catchesForNight(second, local(10, 22, 22))).toBe(0)
    const next = recordFragmentCatch(second, local(10, 22, 23))
    expect(next).toEqual({ night: '2026-10-22', count: 1 })
  })

  it('drops a bad save and merges the higher count on the same night', () => {
    expect(sanitizeNightCatches({ night: 'nope', count: 4 })).toBeNull()
    expect(mergeNightCatches({ night: '2026-10-21', count: 8 }, { night: '2026-10-21', count: 12 }))
      .toEqual({ night: '2026-10-21', count: 12 })
    expect(mergeNightCatches({ night: '2026-10-21', count: 19 }, { night: '2026-10-22', count: 1 }))
      .toEqual({ night: '2026-10-22', count: 1 })
  })

  it('lets cargo stop at the hold while a catch still fits the count', () => {
    expect(holdHasRoom({ orionid_debris: 40 }, 8)).toBe(true)
    expect(holdHasRoom({ iron: 7, orionid_debris: 20 }, 8)).toBe(true)
    expect(holdHasRoom({ iron: 8 }, 8)).toBe(false)
    expect(holdHasRoom({ iron: 8, orionid_debris: 10 }, 8, 'orionid_debris')).toBe(true)
  })
})
