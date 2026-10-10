import { describe, expect, it } from 'vitest'
import type { Mission } from '@/lib/data/types'
import {
  WSW_EVENT_IDS,
  isWorldSpaceWeekLive,
  wswBanner,
  wswChip,
  wswChipsForMission,
  wswEventIdsForMission,
} from './wsw'

type MissionShape = Pick<Mission, 'payload' | 'construction'>

const mining: MissionShape = {}
const saturn: MissionShape = { payload: { type: 'satellite', name: 'Saturn satellite', cargoCost: 1, instrumentId: 'saturn-imager' } }
const deepSpace: MissionShape = { payload: { type: 'deep-space-survey', name: 'Deep Space Telescope', cargoCost: 1, instrumentId: 'deep-space-telescope' } }
const transit: MissionShape = { payload: { type: 'satellite', name: 'Transit Telescope', cargoCost: 1, instrumentId: 'transit-telescope' } }
const rover: MissionShape = { payload: { type: 'rover', name: 'Rover', cargoCost: 1 } }

const oct8 = Date.UTC(2026, 9, 8, 12)
const oct10 = Date.UTC(2026, 9, 10, 12)
const oct12 = Date.UTC(2026, 9, 12, 12)

describe('World Space Week flags', () => {
  it('names the four week events and leaves Orionids out', () => {
    expect(WSW_EVENT_IDS).toEqual(['rocket-revolution-2026', 'saturn-night-2026', 'draconids-2026', 'new-moon-hunt-2026-10'])
    expect(wswChip('orionids-2026', undefined, oct8)).toBeNull()
  })

  it('is live from 4 Oct until the end of 10 Oct UTC', () => {
    expect(isWorldSpaceWeekLive(Date.UTC(2026, 9, 3, 23))).toBe(false)
    expect(isWorldSpaceWeekLive(Date.UTC(2026, 9, 4))).toBe(true)
    expect(isWorldSpaceWeekLive(Date.UTC(2026, 9, 10, 23, 59))).toBe(true)
    expect(isWorldSpaceWeekLive(Date.UTC(2026, 9, 11))).toBe(false)
  })

  it('gives every mission the Launch category and adds the category its type serves', () => {
    expect(wswEventIdsForMission(mining)).toEqual(['rocket-revolution-2026', 'draconids-2026'])
    expect(wswEventIdsForMission(saturn)).toEqual(['rocket-revolution-2026', 'saturn-night-2026'])
    expect(wswEventIdsForMission(deepSpace)).toEqual(['rocket-revolution-2026', 'new-moon-hunt-2026-10'])
    expect(wswEventIdsForMission(transit)).toEqual(['rocket-revolution-2026'])
    expect(wswEventIdsForMission(rover)).toEqual(['rocket-revolution-2026'])
    expect(wswEventIdsForMission({ construction: {} as Mission['construction'] })).toEqual(['rocket-revolution-2026'])
  })

  it('shows gold open in the window and silver open after it', () => {
    expect(wswChipsForMission(saturn, undefined, oct8).map(chip => chip.label)).toEqual(['Launch Gold open', 'Saturn Gold open'])
    expect(wswChipsForMission(saturn, undefined, oct12).map(chip => chip.label)).toEqual(['Launch Silver open', 'Saturn Silver open'])
  })

  it('shows the earned tier instead of the open tier', () => {
    const badges = { 'rocket-revolution-2026': { eventId: 'rocket-revolution-2026', tier: 'silver' as const, earnedAt: oct12 } }
    expect(wswChip('rocket-revolution-2026', badges, oct8)?.state).toBe('silver-earned')
    expect(wswChip('rocket-revolution-2026', undefined, oct8)?.state).toBe('gold-open')
  })

  it('shows no chip for an event that has not opened yet', () => {
    expect(wswChip('draconids-2026', undefined, Date.UTC(2026, 9, 5))).toBeNull()
    expect(wswChip('new-moon-hunt-2026-10', undefined, oct8)).toBeNull()
    expect(wswChip('new-moon-hunt-2026-10', undefined, oct10)?.category).toBe('New Moon')
  })

  it('summarises the banner while the week runs and after it', () => {
    const badges = { 'saturn-night-2026': { eventId: 'saturn-night-2026', tier: 'gold' as const, earnedAt: oct8 } }
    expect(wswBanner(badges, oct8)).toMatchObject({ live: true, title: 'World Space Week 4-10 OCT', earned: 1, total: 4 })
    expect(wswBanner(badges, oct12)).toMatchObject({ live: false, title: 'World Space Week ended', detail: 'Silver badges are still open.' })
  })
})
