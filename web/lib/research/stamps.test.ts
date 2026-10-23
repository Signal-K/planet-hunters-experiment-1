import { describe, expect, it } from 'vitest'
import { addStamp, type ResearchStamps, communityBar, mergeStamps, monthGrid, sanitizeStamps, stampDayKey, stampStreak, stampsInMonth } from './stamps'

const D = 86_400_000
const t = Date.UTC(2026, 9, 22, 12)

describe('research stamps', () => {
  it('stamps a day once per kind and keeps the same object when repeated', () => {
    const a = addStamp<{ researchStamps?: ResearchStamps }>({}, 'survey', t)
    expect(a.researchStamps).toEqual({ '2026-10-22': ['survey'] })
    expect(addStamp(a, 'survey', t + 1000)).toBe(a)
    expect(addStamp(a, 'event', t).researchStamps?.['2026-10-22']).toEqual(['survey', 'event'])
  })
  it('drops bad days and kinds on load', () => {
    expect(sanitizeStamps({ '2026-10-22': ['survey', 'nope'], bad: ['survey'], '2026-10-21': 'x' })).toEqual({ '2026-10-22': ['survey'] })
    expect(sanitizeStamps([])).toEqual({})
  })
  it('merges per day as a union', () => {
    expect(mergeStamps({ '2026-10-22': ['survey'] }, { '2026-10-22': ['event'], '2026-10-21': ['survey'] }))
      .toEqual({ '2026-10-22': ['survey', 'event'], '2026-10-21': ['survey'] })
  })
  it('streak survives an open today and breaks after a missed day', () => {
    const s = { [stampDayKey(t - D)]: ['survey' as const], [stampDayKey(t - 2 * D)]: ['survey' as const] }
    expect(stampStreak(s, t)).toBe(2)
    expect(stampStreak({ ...s, [stampDayKey(t)]: ['event'] }, t)).toBe(3)
    expect(stampStreak({ [stampDayKey(t - 3 * D)]: ['survey'] }, t)).toBe(0)
  })
  it('lays out October 2026 starting on Thursday with Monday weeks', () => {
    const weeks = monthGrid(2026, 9, { '2026-10-22': ['survey'] }, t)
    expect(weeks[0].slice(0, 3)).toEqual([null, null, null])
    expect(weeks[0][3]?.day).toBe(1)
    expect(weeks.flat().filter(Boolean)).toHaveLength(31)
    expect(weeks.flat().find(c => c?.today)?.day).toBe(22)
    expect(weeks.every(w => w.length === 7)).toBe(true)
  })
  it('counts the month and fills the community bar', () => {
    expect(stampsInMonth({ '2026-10-01': ['survey', 'event'], '2026-09-30': ['survey'] }, 2026, 9)).toBe(2)
    expect(communityBar(10, 500).fill).toBeCloseTo(0.51)
    expect(communityBar(10, 995).reached).toBe(true)
  })
})
