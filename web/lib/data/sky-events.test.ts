import { describe, expect, it } from 'vitest'
import {
  badgeTierFor,
  grantBadge,
  grantBadgesForActivity,
  isNewMoonDay,
  resolveSaturnBadgeTier,
  sanitizeBadges,
  DRACONIDS_DEBRIS_PRESET,
  ORIONIDS_DEBRIS_PRESET,
  activeDebrisPreset,
  applyDebrisMined,
  debrisRatePerMinute,
  isDebrisEventActive,
  isLocalNight,
  captureOrionidsQueryFlag,
  isOrionidsTeaserWindow,
  orionidsCountdown,
  orionidsDevForced,
  orionidsForcedInstant,
  orionidsTeaserDayKey,
  orionidsTeaserDevForced,
  orionidsTeaserForcedInstant,
  shouldShowOrionidsTeaser,
} from './sky-events'
import { MINERAL_META } from './minerals'

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

// Local-time constructors keep these independent of the CI timezone.
const local = (m: number, d: number, h: number, min = 0) => new Date(2026, m - 1, d, h, min).getTime()

describe('isLocalNight', () => {
  it('is 22:00 inclusive to 06:00 exclusive', () => {
    expect(isLocalNight(local(10, 25, 21, 59))).toBe(false)
    expect(isLocalNight(local(10, 25, 22, 0))).toBe(true)
    expect(isLocalNight(local(10, 25, 23, 59))).toBe(true)
    expect(isLocalNight(local(10, 26, 0, 0))).toBe(true)
    expect(isLocalNight(local(10, 26, 5, 59))).toBe(true)
    expect(isLocalNight(local(10, 26, 6, 0))).toBe(false)
    expect(isLocalNight(local(10, 26, 13, 0))).toBe(false)
  })
})

describe('isDebrisEventActive (Orionids)', () => {
  const p = ORIONIDS_DEBRIS_PRESET
  it('is active mid-window at night, inactive by day', () => {
    expect(isDebrisEventActive(p, local(10, 28, 23))).toBe(true)
    expect(isDebrisEventActive(p, local(10, 28, 12))).toBe(false)
  })
  it('is inactive before the window and after it, even at night', () => {
    expect(isDebrisEventActive(p, local(10, 10, 23))).toBe(false)
    expect(isDebrisEventActive(p, local(10, 18, 23))).toBe(false)
    expect(isDebrisEventActive(p, local(11, 12, 23))).toBe(false)
  })
  it('opens at local midnight on 19 Oct', () => {
    expect(isDebrisEventActive(p, local(10, 19, 0))).toBe(true)
    expect(isDebrisEventActive(p, local(10, 19, 12))).toBe(false)
    expect(isDebrisEventActive(p, local(10, 19, 23))).toBe(true)
    expect(badgeTierFor('orionids-2026', local(10, 18, 23))).toBeNull()
    expect(badgeTierFor('orionids-2026', local(10, 19, 23))).toBe('gold')
  })
  it('covers the 7 Nov end and the 21-22 Oct peak night', () => {
    expect(isDebrisEventActive(p, local(11, 7, 23))).toBe(true)
    expect(isDebrisEventActive(p, local(10, 21, 23))).toBe(true)
    expect(isDebrisEventActive(p, local(10, 22, 1))).toBe(true)
  })
  it('rejects non-finite input', () => {
    expect(isDebrisEventActive(p, Number.NaN)).toBe(false)
  })
  it('activeDebrisPreset resolves the matching preset only', () => {
    expect(activeDebrisPreset(local(10, 28, 23))?.eventId).toBe('orionids-2026')
    expect(activeDebrisPreset(local(10, 8, 23))?.eventId).toBe('draconids-2026')
    expect(activeDebrisPreset(local(10, 15, 23))).toBeNull()
    expect(activeDebrisPreset(local(10, 28, 12))).toBeNull()
  })
})

describe('debrisRatePerMinute', () => {
  it('is zero outside the event and ramps to the peak rate', () => {
    expect(debrisRatePerMinute(ORIONIDS_DEBRIS_PRESET, local(10, 28, 12))).toBe(0)
    const peak = debrisRatePerMinute(ORIONIDS_DEBRIS_PRESET, Date.parse('2026-10-22T00:00:00Z') + 0)
    const later = debrisRatePerMinute(ORIONIDS_DEBRIS_PRESET, local(11, 6, 23))
    if (peak > 0) expect(peak).toBeGreaterThan(later)
    expect(later).toBeGreaterThanOrEqual(ORIONIDS_DEBRIS_PRESET.baseRatePerMinute)
    expect(later).toBeLessThan(ORIONIDS_DEBRIS_PRESET.peakRatePerMinute)
  })
  it('Draconids stay slower than Orionids', () => {
    expect(DRACONIDS_DEBRIS_PRESET.peakRatePerMinute).toBeLessThan(ORIONIDS_DEBRIS_PRESET.baseRatePerMinute)
  })
})

describe('applyDebrisMined badge', () => {
  it('grants gold on the first debris mined in the window, once', () => {
    const at = local(10, 28, 23)
    const first = applyDebrisMined(blank(), ORIONIDS_DEBRIS_PRESET, at)
    expect(first.badge?.eventId).toBe('orionids-2026')
    expect(first.badge?.tier).toBe('gold')
    const second = applyDebrisMined(first.player, ORIONIDS_DEBRIS_PRESET, at + 60_000)
    expect(second.badge).toBeNull()
    expect(second.player).toBe(first.player)
  })
  it('grants silver after the window', () => {
    const at = Date.parse('2026-11-20T12:00:00Z')
    const r = applyDebrisMined(blank(), ORIONIDS_DEBRIS_PRESET, at)
    expect(r.badge?.tier).toBe('silver')
    expect(badgeTierFor('orionids-2026', at)).toBe('silver')
  })
  it('does not grant the Draconids badge for Orionid debris', () => {
    const r = applyDebrisMined(blank(), ORIONIDS_DEBRIS_PRESET, local(10, 28, 23))
    expect(r.player.badges?.['draconids-2026']).toBeUndefined()
  })
})

describe('orionids force clock', () => {
  it('lands on peak night inside the window', () => {
    const at = orionidsForcedInstant()
    expect(isDebrisEventActive(ORIONIDS_DEBRIS_PRESET, at)).toBe(true)
    expect(badgeTierFor('orionids-2026', at)).toBe('gold')
    expect(activeDebrisPreset(at)?.eventId).toBe('orionids-2026')
  })

  it('keeps ?orionids=1 after the query string is gone', () => {
    const store = new Map<string, string>()
    const prev = globalThis.window
    const win = {
      location: { search: '?preset=m1-mining&orionids=1' },
      localStorage: {
        getItem: (k: string) => store.get(k) ?? null,
        setItem: (k: string, v: string) => { store.set(k, v) },
        removeItem: (k: string) => { store.delete(k) },
      },
    }
    globalThis.window = win as unknown as Window & typeof globalThis
    captureOrionidsQueryFlag()
    win.location.search = ''
    expect(orionidsDevForced()).toBe(true)
    win.location.search = '?orionids=0'
    expect(orionidsDevForced()).toBe(false)
    expect(orionidsTeaserDevForced()).toBe(false)
    win.location.search = '?orionids=teaser'
    expect(orionidsTeaserDevForced()).toBe(true)
    expect(orionidsDevForced()).toBe(false)
    win.location.search = '?orionids=1'
    expect(orionidsDevForced()).toBe(true)
    expect(orionidsTeaserDevForced()).toBe(false)
    globalThis.window = prev
  })
})

describe('orionids teaser', () => {
  it('runs from 7 Oct local until midnight on the 19th', () => {
    expect(isOrionidsTeaserWindow(local(10, 6, 23))).toBe(false)
    expect(isOrionidsTeaserWindow(local(10, 7, 0))).toBe(true)
    expect(isOrionidsTeaserWindow(local(10, 18, 23))).toBe(true)
    expect(isOrionidsTeaserWindow(local(10, 19, 0))).toBe(false)
  })

  it('counts whole days and hours to 19 Oct', () => {
    expect(orionidsCountdown(local(10, 18, 12))).toEqual({ days: 0, hours: 12 })
    expect(orionidsCountdown(local(10, 12, 15))).toEqual({ days: 6, hours: 9 })
  })

  it('shows at most once per local day, unless forced', () => {
    const at = local(10, 12, 9)
    const today = orionidsTeaserDayKey(at)
    expect(shouldShowOrionidsTeaser(at, null, false)).toBe(true)
    expect(shouldShowOrionidsTeaser(at, today, false)).toBe(false)
    expect(shouldShowOrionidsTeaser(at, orionidsTeaserDayKey(local(10, 11, 9)), false)).toBe(true)
    expect(shouldShowOrionidsTeaser(local(10, 20, 12), today, false)).toBe(false)
    expect(shouldShowOrionidsTeaser(local(10, 20, 12), today, true)).toBe(true)
  })

  it('pins the teaser clock before the shower', () => {
    const at = orionidsTeaserForcedInstant()
    expect(isOrionidsTeaserWindow(at)).toBe(true)
    expect(isDebrisEventActive(ORIONIDS_DEBRIS_PRESET, at)).toBe(false)
    expect(orionidsCountdown(at)).toEqual({ days: 6, hours: 9 })
  })
})

describe('debris resources', () => {
  it('are registered and priced from the shared rarity bands', () => {
    for (const preset of [ORIONIDS_DEBRIS_PRESET, DRACONIDS_DEBRIS_PRESET]) {
      const meta = MINERAL_META[preset.resourceId]
      expect(meta).toBeDefined()
      expect(meta.price).toBeGreaterThan(0)
    }
  })
})
