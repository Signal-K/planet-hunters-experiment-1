import { describe, expect, it } from 'vitest'
import { structureSprite } from '@/lib/scene/base-site'
import { placeProbe, sectorsMapped } from '@/lib/probes/survey-probe'
import { rocketPrice } from '@/lib/rockets'
import { sellUnitPrice, applyUpgradeBuilding } from './EconomySystem'
import type { GameState } from '@/lib/game-types'

const NOW = Date.parse('2026-11-12T10:00:00Z')

describe('SSL-792: hangar, Exchange and control station levels', () => {
  it('draws its own sprite at each level', () => {
    for (const kind of ['hangar', 'market', 'control-station']) {
      const srcs = [1, 2, 3].map(level => structureSprite(kind, level)!.src)
      expect(new Set(srcs).size).toBe(3)
    }
  })

  it('upgrades a placed building for francs', () => {
    const s = { player: { placed: ['hangar'], francs: 50_000_000, buildingLevels: {} } } as unknown as GameState
    const up = applyUpgradeBuilding(s, 'hangar')
    expect(up.player.buildingLevels?.hangar).toBe(2)
    expect(up.player.francs).toBe(44_000_000)
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
    const fast = placeProbe({ placed: ['control-station'], buildingLevels: { 'control-station': 3 } } as Parameters<typeof placeProbe>[0], 'eros', NOW).probes!.eros
    const slow = placeProbe<Pick<import('@/lib/game-types').Player, 'probes'>>({}, 'eros', NOW).probes!.eros
    expect(sectorsMapped(fast, NOW + 6 * 3_600_000)).toHaveLength(6)
    expect(sectorsMapped(slow, NOW + 6 * 3_600_000)).toHaveLength(3)
  })
})
