import { describe, expect, it } from 'vitest'
import { structureSprite } from '@/lib/scene/base-site'
import { placeProbe, sectorsMapped, startProbeScan } from '@/lib/probes/survey-probe'
import { rocketPrice } from '@/lib/rockets'
import { sellUnitPrice } from './EconomySystem'

const NOW = Date.parse('2026-11-12T10:00:00Z')

describe('SSL-792: hangar, Exchange and control station levels', () => {
  it('draws its own sprite at each level', () => {
    for (const kind of ['hangar', 'market', 'control-station']) {
      const srcs = [1, 2, 3].map(level => structureSprite(kind, level)!.src)
      expect(new Set(srcs).size).toBe(3)
    }
  })

  it('an upgraded Exchange pays more and an upgraded hangar sells rockets for less', () => {
    const base = { placed: ['market'] }
    const l1 = sellUnitPrice('platinum', base, undefined, NOW).price
    const l3 = sellUnitPrice('platinum', { ...base, buildingLevels: { market: 3 } }, undefined, NOW).price
    expect(l3).toBe(Math.round(l1 * 1.06))
    const rocket = { costFrancs: 10_000_000 }
    const pilot = { missionsDone: 9 } as Parameters<typeof rocketPrice>[1]
    expect(rocketPrice(rocket, { ...pilot, placed: ['hangar'], buildingLevels: { hangar: 2 } })).toBe(9_000_000)
    expect(rocketPrice(rocket, { ...pilot, buildingLevels: { hangar: 2 } })).toBe(10_000_000)
  })

  it('a probe launched from a level 3 control station maps a sector every hour', () => {
    const fast = startProbeScan(placeProbe({ placed: ['control-station'], buildingLevels: { 'control-station': 3 } } as Parameters<typeof placeProbe>[0], 'eros', NOW), 'eros', NOW).probes!.eros
    const slow = startProbeScan(placeProbe<Pick<import('@/lib/game-types').Player, 'probes'>>({}, 'eros', NOW), 'eros', NOW).probes!.eros
    expect(sectorsMapped(fast, NOW + 6 * 3_600_000)).toHaveLength(6)
    expect(sectorsMapped(slow, NOW + 6 * 3_600_000)).toHaveLength(3)
  })
})

describe('rocket price follows progress (SSL-892)', () => {
  it('is flat through the grace window, rises after it, and is capped', () => {
    const rocket = { costFrancs: 10_000_000 }
    const at = (missionsDone: number) => rocketPrice(rocket, { missionsDone } as Parameters<typeof rocketPrice>[1])
    expect(at(10)).toBe(10_000_000)
    expect(at(20)).toBe(12_000_000)
    expect(at(10_000)).toBe(20_000_000)
  })
})

describe('hardware missions cost a premium until the agency can manufacture (SSL-892)', () => {
  it('rovers fall to list price with refining and storage, other payloads never pay it', () => {
    const rocket = { costFrancs: 10_000_000 }
    const p = (levels: Record<string, number>) => ({ missionsDone: 0, agencyLevels: levels } as unknown as Parameters<typeof rocketPrice>[1])
    expect(rocketPrice(rocket, p({}), { payloadType: 'rover' })).toBe(30_000_000)
    expect(rocketPrice(rocket, p({ refining: 1, 'ore-storage': 1 }), { payloadType: 'rover' })).toBe(22_000_000)
    expect(rocketPrice(rocket, p({ refining: 3, 'ore-storage': 3 }), { payloadType: 'rover' })).toBe(10_000_000)
    expect(rocketPrice(rocket, p({}), { payloadType: 'satellite' })).toBe(10_000_000)
  })
})
