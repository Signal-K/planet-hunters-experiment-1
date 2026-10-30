import { describe, expect, it } from 'vitest'
import { addStamp, type ResearchStamps, communityBar, historicalContributionMonths, mergeStamps, monthGrid, researchMonthHistory, sanitizeStamps, stampDayKey, stampStreak, stampsInMonth } from './stamps'

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
    const server = { month: '2026-10', others: 500, goal: 1000, bonusPct: 3, reachedAt: null, bonusUntil: null }
    expect(communityBar(10, server).fill).toBeCloseTo(0.51)
    expect(communityBar(10, server).reached).toBe(false)
    expect(communityBar(10, { ...server, others: 995, reachedAt: t, bonusUntil: t + 7 * D }).reached).toBe(true)
    expect(communityBar(4, null)).toMatchObject({ total: 4, goal: 1000, reached: false })
  })
  it('returns recent personal months newest first', () => {
    expect(researchMonthHistory({ '2026-10-22': ['survey'], '2026-09-03': ['event', 'survey'] }, Date.UTC(2026, 9, 26), 2)).toEqual([
      { key: '2026-10', label: 'October 2026', stamps: 1 },
      { key: '2026-09', label: 'September 2026', stamps: 2 },
    ])
  })
  it('adds citizen science records from September and earlier without making retroactive rewards', () => {
    const history = historicalContributionMonths({}, [Date.UTC(2026, 8, 3), Date.UTC(2026, 8, 18), Date.UTC(2026, 9, 1)], Date.UTC(2026, 9, 26))
    expect(history).toEqual({ '2026-09': 2 })
    expect(researchMonthHistory({}, Date.UTC(2026, 9, 26), 2, history)[1]).toMatchObject({ key: '2026-09', stamps: 2 })
  })
})
