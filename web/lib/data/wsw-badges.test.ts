import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  WSW_BADGES, getWswBadge, grantWswBadge, wswBadgeFor, wswMissionTypeFor, type WswMissionType,
} from './wsw-badges'
import { SKY_EVENTS, grantBadgesForActivity, applyDebrisMined, DRACONIDS_DEBRIS_PRESET, skyEventNow } from './sky-events'
import type { Mission } from './types'
import type { Player } from '@/lib/game-types'

const blank = (): Pick<Player, 'badges'> => ({})
const base = { id: 'm', title: 't', brief: '', tag: '', difficulty: 'L1', locked: false, sequence: 1,
  requires: { minerals: {}, cargo_min: 0, drill_tier: 1, max_orbit: 1 }, payout: { francs: 0, affinity: 0 } } as Mission

afterEach(() => vi.useRealTimers())

describe('WSW mapping', () => {
  it('maps every mission type to exactly one badge and a real sky event', () => {
    const types: WswMissionType[] = ['onboarding-relay', 'mining-free-ops', 'rover-surface-ops', 'satellite-survey', 'citizen-science', 'construction-launch']
    expect(WSW_BADGES.map(b => b.type).sort()).toEqual([...types].sort())
    for (const def of WSW_BADGES) {
      expect(SKY_EVENTS.some(e => e.id === def.eventId)).toBe(true)
      expect(getWswBadge(def.badgeId)).toBe(def)
    }
    expect(new Set(WSW_BADGES.map(b => b.badgeId)).size).toBe(types.length)
  })
  it('launch maps to Rocket Revolution, citizen science to Saturn, mining to Draconids', () => {
    expect(wswBadgeFor('construction-launch').eventId).toBe('rocket-revolution-2026')
    expect(wswBadgeFor('citizen-science').eventId).toBe('saturn-night-2026')
    expect(wswBadgeFor('mining-free-ops').eventId).toBe('draconids-2026')
  })
  it('classifies missions', () => {
    expect(wswMissionTypeFor(undefined, false)).toBe('onboarding-relay')
    expect(wswMissionTypeFor(base, true)).toBe('mining-free-ops')
    expect(wswMissionTypeFor({ ...base, payload: { type: 'rover' } as Mission['payload'] }, true)).toBe('rover-surface-ops')
    expect(wswMissionTypeFor({ ...base, payload: { type: 'deep-space-survey' } as Mission['payload'] }, true)).toBe('satellite-survey')
    expect(wswMissionTypeFor({ ...base, construction: {} as Mission['construction'] }, true)).toBe('construction-launch')
  })
})

describe('grantWswBadge', () => {
  const gold = Date.parse('2026-10-09T12:00:00Z')
  const silver = Date.parse('2026-10-20T12:00:00Z')
  it('is gold during WSW, silver after, nothing before, idempotent', () => {
    const g = grantWswBadge(blank(), 'rover-surface-ops', gold)
    expect(g.granted?.tier).toBe('gold')
    expect(grantWswBadge(g.player, 'rover-surface-ops', silver).player).toBe(g.player)
    expect(grantWswBadge(blank(), 'rover-surface-ops', silver).granted?.tier).toBe('silver')
    const p = blank()
    expect(grantWswBadge(p, 'rover-surface-ops', Date.parse('2026-10-03T23:59:59Z')).player).toBe(p)
  })
})

describe('badges fire today (fake clock, 9 Oct 2026)', () => {
  it('launch and Draconids badges are gold', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-10-09T12:00:00Z'))
    const now = skyEventNow(false)
    const launch = grantBadgesForActivity(blank(), 'launch', now)
    expect(launch.player.badges?.['rocket-revolution-2026']?.tier).toBe('gold')
    const dust = applyDebrisMined(blank(), DRACONIDS_DEBRIS_PRESET, now)
    expect(dust.badge?.tier).toBe('gold')
    expect(grantWswBadge(launch.player, 'construction-launch', now).granted?.tier).toBe('gold')
  })
})
