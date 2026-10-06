import { describe, expect, it } from 'vitest'
import {
  badgeTierFor,
  grantBadge,
  grantBadgesForActivity,
  isNewMoonDay,
  resolveSaturnBadgeTier,
  sanitizeBadges,
  DRACONIDS_DEBRIS_PRESET,
} from './sky-events'

import type { Player } from '@/lib/game-types'
const blank = (): Pick<Player, 'badges'> => ({})
const RR = 'rocket-revolution-2026'

describe('badgeTierFor', () => {
  it('is null before the event opens', () => {
    expect(badgeTierFor(RR, new Date('2026-10-03T23:59:59Z'))).toBeNull()
  })
  it('is gold from open through 10 Oct 23:59 UTC', () => {
    expect(badgeTierFor(RR, new Date('2026-10-04T00:00:00Z'))).toBe('gold')
    expect(badgeTierFor(RR, new Date('2026-10-10T23:59:59Z'))).toBe('gold')
  })
  it('is silver from 11 Oct 00:00 UTC', () => {
    expect(badgeTierFor(RR, new Date('2026-10-11T00:00:00Z'))).toBe('silver')
    expect(badgeTierFor(RR, Date.parse('2027-03-01T00:00:00Z'))).toBe('silver')
  })
  it('is null for unknown events', () => {
    expect(badgeTierFor('nope', new Date())).toBeNull()
  })
})

describe('grantBadge', () => {
  const gold = Date.parse('2026-10-07T00:00:00Z')
  const silver = Date.parse('2026-10-20T00:00:00Z')
  it('grants and is idempotent', () => {
    const once = grantBadge(blank(), RR, gold)
    expect(once.badges?.[RR]).toEqual({ eventId: RR, tier: 'gold', earnedAt: gold })
    expect(grantBadge(once, RR, gold)).toBe(once)
  })
  it('never downgrades gold to silver', () => {
    const once = grantBadge(blank(), RR, gold)
    expect(grantBadge(once, RR, silver)).toBe(once)
  })
  it('upgrades silver to gold only', () => {
    const s = grantBadge(blank(), RR, silver)
    expect(s.badges?.[RR].tier).toBe('silver')
    expect(grantBadge(s, RR, gold).badges?.[RR].tier).toBe('gold')
  })
  it('grants nothing before the event', () => {
    const p = blank()
    expect(grantBadge(p, RR, Date.parse('2026-09-01T00:00:00Z'))).toBe(p)
  })
  it('grants per activity kind', () => {
    const r = grantBadgesForActivity(blank(), 'launch', gold)
    expect(r.granted.map(b => b.eventId)).toEqual([RR])
    expect(grantBadgesForActivity(r.player, 'launch', gold).granted).toEqual([])
  })
})

describe('resolveSaturnBadgeTier', () => {
  it('matches the date played', () => {
    expect(resolveSaturnBadgeTier(Date.parse('2026-10-07T20:00:00Z'))).toBe('gold')
    expect(resolveSaturnBadgeTier(Date.parse('2026-10-12T20:00:00Z'))).toBe('silver')
    expect(resolveSaturnBadgeTier(Date.parse('2026-09-30T20:00:00Z'))).toBeNull()
  })
})

describe('sanitizeBadges', () => {
  it('drops malformed entries', () => {
    expect(sanitizeBadges({ a: { tier: 'gold', earnedAt: 1 }, b: { tier: 'bronze', earnedAt: 1 }, c: null }))
      .toEqual({ a: { eventId: 'a', tier: 'gold', earnedAt: 1 } })
    expect(sanitizeBadges(undefined)).toEqual({})
  })
})

describe('isNewMoonDay', () => {
  it('matches known new moons (UTC day)', () => {
    expect(isNewMoonDay('2026-10-10')).toBe(true) // 15:50 UTC
    expect(isNewMoonDay('2026-09-11')).toBe(true) // 03:27 UTC
    expect(isNewMoonDay('2026-11-09')).toBe(true) // 07:02 UTC
  })
  it('is false on ordinary days', () => {
    expect(isNewMoonDay('2026-10-09')).toBe(false)
    expect(isNewMoonDay('2026-10-11')).toBe(false)
    expect(isNewMoonDay('2026-10-24')).toBe(false)
  })
  it('hits roughly once a month', () => {
    let n = 0
    for (let d = 0; d < 365; d += 1) {
      if (isNewMoonDay(new Date(Date.UTC(2026, 0, 1 + d)).toISOString().slice(0, 10))) n += 1
    }
    expect(n).toBeGreaterThanOrEqual(12)
    expect(n).toBeLessThanOrEqual(13)
  })
})

describe('Draconids preset', () => {
  it('is slow and low-rate', () => {
    expect(DRACONIDS_DEBRIS_PRESET.speedFactor).toBeLessThan(1)
    expect(DRACONIDS_DEBRIS_PRESET.peakRatePerMinute).toBeLessThanOrEqual(5)
  })
})
