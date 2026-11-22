import { describe, expect, it } from 'vitest'
import {
  fleetDataCount, conditionedCount, craftCondition, craftNeedingService, mergeCraftServicedAt, mergeStormDays, serviceCraft, stormDaysFromKp,
} from './condition'

const DAY = 86_400_000
const launch = Date.parse('2026-12-01T12:00:00Z')

describe('craft condition (SSL-852)', () => {
  it('has no condition for a craft the agency does not have', () => {
    expect(craftCondition({}, 'space-telescope', launch)).toBeNull()
  })

  it('wears 1.5% a day from use and time, and offers servicing below 75%', () => {
    const player = { transitSatelliteLaunchedAt: launch }
    expect(craftCondition(player, 'space-telescope', launch)).toMatchObject({ percent: 100, state: 'good', needsService: false })
    expect(craftCondition(player, 'space-telescope', launch + 10 * DAY)).toMatchObject({ percent: 85, needsService: false })
    expect(craftCondition(player, 'space-telescope', launch + 20 * DAY)).toMatchObject({ percent: 70, state: 'good', needsService: true })
    expect(craftCondition(player, 'space-telescope', launch + 40 * DAY)).toMatchObject({ percent: 40, state: 'worn' })
    expect(craftCondition(player, 'space-telescope', launch + 60 * DAY)).toMatchObject({ percent: 10, state: 'failed' })
  })

  it('takes (Kp - 4) x 6% for each storm day after the last service, once per day', () => {
    const player = { saturnImagerLaunchedAt: launch, spaceStorms: { '2026-11-30': 8, '2026-12-02': 5, '2026-12-03': 7.33 } }
    // Launch day + 2 days: 3% from time, 6% (G1) + 20% (Kp 7.33) from storms. The storm before launch does not count.
    const c = craftCondition(player, 'saturn-satellite', launch + 2 * DAY)
    expect(c).toMatchObject({ storms: 2, percent: 71 })
  })

  it('is back to 100% after a servicing mission, and earlier storms stop counting', () => {
    const player = { transitSatelliteLaunchedAt: launch, spaceStorms: { '2026-12-05': 9 } }
    const serviced = serviceCraft(player, 'space-telescope', launch + 30 * DAY)
    // 45% from time and 30% from a G5 storm.
    expect(craftCondition(player, 'space-telescope', launch + 30 * DAY)).toMatchObject({ percent: 25, state: 'worn' })
    expect(craftCondition(serviced, 'space-telescope', launch + 30 * DAY)).toMatchObject({ percent: 100, storms: 0 })
  })

  it('sends all data when good, half rounded up when worn, nothing when failed', () => {
    expect(conditionedCount(3, null)).toBe(3)
    expect(conditionedCount(3, { state: 'good' })).toBe(3)
    expect(conditionedCount(3, { state: 'worn' })).toBe(2)
    expect(conditionedCount(1, { state: 'worn' })).toBe(1)
    expect(conditionedCount(3, { state: 'failed' })).toBe(0)
  })

  it('lists craft needing service, worst first', () => {
    const player = { transitSatelliteLaunchedAt: launch, saturnImagerLaunchedAt: launch + 15 * DAY }
    expect(craftNeedingService(player, launch + 35 * DAY).map(c => c.craft)).toEqual(['space-telescope', 'saturn-satellite'])
  })
})

it('starts a craft launched before the rule from full on 17 Nov 2026', () => {
  const old = { transitSatelliteLaunchedAt: Date.parse('2026-03-01T00:00:00Z') }
  expect(craftCondition(old, 'space-telescope', Date.parse('2026-11-17T00:00:00Z'))?.percent).toBe(100)
  expect(craftCondition(old, 'space-telescope', Date.parse('2026-11-27T00:00:00Z'))?.percent).toBe(85)
})

describe('NOAA storm days', () => {
  it('reads both NOAA K-index formats, keeping each day once at its highest Kp of 5 or more', () => {
    const objects = [
      { time_tag: '2026-11-10T00:00:00', Kp: 3 },
      { time_tag: '2026-11-11T03:00:00', Kp: 5.33 },
      { time_tag: '2026-11-11T06:00:00', Kp: 6.67 },
    ]
    expect(stormDaysFromKp(objects)).toEqual({ '2026-11-11': 6.67 })
    const arrays = [['time_tag', 'Kp', 'a_running', 'station_count'], ['2026-11-12 00:00:00.000', '5.00', '48', '8']]
    expect(stormDaysFromKp(arrays)).toEqual({ '2026-11-12': 5 })
    expect(stormDaysFromKp({ nope: true })).toEqual({})
  })

  it('merges saves, keeping the higher Kp and dropping days over a year old', () => {
    const now = Date.parse('2026-11-17T00:00:00Z')
    expect(mergeStormDays({ '2026-11-11': 6, '2025-01-01': 9 }, { '2026-11-11': 7, '2026-11-12': 5 }, now)).toEqual({ '2026-11-11': 7, '2026-11-12': 5 })
    expect(mergeCraftServicedAt({ 'space-telescope': 5 }, { 'space-telescope': 9, 'saturn-satellite': 2 })).toEqual({ 'space-telescope': 9, 'saturn-satellite': 2 })
  })
})

describe('servicing in the agency programme and the Agency path', async () => {
  const { agencySummary } = await import('./programme')
  const { agencySteps } = await import('@/lib/research/paths')
  it('names the worst-worn craft, halves its data, and puts servicing first on the Agency path', () => {
    const now = Date.parse('2026-12-20T00:00:00Z')
    const player = {
      freeOperations: true, placed: [], transitSatelliteLaunchedAt: Date.parse('2026-12-01T00:00:00Z'), transitSatelliteLevel: 2,
      deepSpaceTelescopeBuilt: true, deepSpaceTelescopeLevel: 1, saturnImagerLaunchedAt: null, probes: {},
      tessClassifications: {}, asteroidClassifications: {}, saturnClassifications: {},
      spaceStorms: { '2026-12-10': 8 },
    } as unknown as Parameters<typeof agencySummary>[0]
    const summary = agencySummary(player, now)
    // 19 days (28.5%) and a Kp 8 storm (24%): 48%, worn.
    expect(summary.needsService?.condition).toMatchObject({ percent: 48, state: 'worn' })
    expect(summary.needsService?.dataPerDay).toBe(2)
    const steps = agencySteps({ eventName: null, nextLaunch: null, hasData: true, ownedNames: ['Space telescope'], service: { name: 'Space telescope', percent: 48, failed: false } })
    expect(steps[0]).toMatchObject({ id: 'launch', title: 'Service the space telescope' })
  })
})

it('keeps a newly launched craft producing while an older craft has failed', () => {
  const now = Date.parse('2027-03-01T12:00:00Z')
  const old = now - 90 * DAY
  const player = { transitSatelliteLaunchedAt: old, agencyLaunches: { old: { craft: 'space-telescope' as const, at: old }, fresh: { craft: 'space-telescope' as const, at: now - DAY } } }
  expect(fleetDataCount(player, 'space-telescope', 2, now)).toBe(2)
  expect(fleetDataCount({ ...player, agencyDonations: { 'space-telescope': true } }, 'space-telescope', 2, now, true)).toBe(2)
})
