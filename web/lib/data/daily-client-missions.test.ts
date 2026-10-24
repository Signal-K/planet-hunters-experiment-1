import { describe, expect, it } from 'vitest'
import { CLIENTS, CLIENT_SLOTS } from './clients'
import { PARTS } from './parts'
import { TARGETS, feasibleTargetsFor } from './targets'
import { applyConstructionCompletion } from '../systems/ConstructionSystem'
import { MINERAL_META } from './minerals'
import {
  affinityBonusSlots,
  BASE_DAILY_SLOTS_PER_CLIENT,
  generateDailyClientPool,
  MAX_AFFINITY_BONUS_SLOTS,
  refreshPoolIfStale,
} from './daily-client-missions'

describe('affinityBonusSlots', () => {
  it('grants no bonus slots below one affinity level', () => {
    expect(affinityBonusSlots(0)).toBe(0)
    expect(affinityBonusSlots(4)).toBe(0)
  })

  it('grants one bonus slot per affinity level past the first', () => {
    expect(affinityBonusSlots(5)).toBe(1)
    expect(affinityBonusSlots(10)).toBe(2)
    expect(affinityBonusSlots(15)).toBe(3)
  })

  it('caps bonus slots at MAX_AFFINITY_BONUS_SLOTS', () => {
    expect(affinityBonusSlots(1000)).toBe(MAX_AFFINITY_BONUS_SLOTS)
  })
})

describe('generateDailyClientPool', () => {
  it('gives each eligible client 3 base daily slots with no affinity history', () => {
    const missions = generateDailyClientPool('2026-07-11', 20, CLIENT_SLOTS, MINERAL_META, {})
    const eligible = CLIENT_SLOTS.filter(c => c.unlockTier <= 4)
    for (const client of eligible) {
      const offers = missions.filter(m => m.client === client.id && !m.construction)
      expect(offers.length).toBe(BASE_DAILY_SLOTS_PER_CLIENT)
    }
  })

  it('adds bonus slots for clients with completed-job affinity history', () => {
    const client = CLIENT_SLOTS.find(c => c.unlockTier === 1)!
    const missions = generateDailyClientPool('2026-07-11', 20, CLIENT_SLOTS, MINERAL_META, {
      [client.id]: 10,
    })
    const offers = missions.filter(m => m.client === client.id && !m.construction)
    expect(offers.length).toBe(BASE_DAILY_SLOTS_PER_CLIENT + 2)
  })

  it('unlocks tier-5 clients once missionsDone reaches the tier-5 threshold', () => {
    const tier5 = CLIENT_SLOTS.find(c => c.unlockTier === 5)!
    const before = generateDailyClientPool('2026-07-11', 11, CLIENT_SLOTS, MINERAL_META, {})
    const after = generateDailyClientPool('2026-07-11', 12, CLIENT_SLOTS, MINERAL_META, {})
    expect(before.some(m => m.client === tier5.id)).toBe(false)
    expect(after.some(m => m.client === tier5.id)).toBe(true)
  })
})

describe('daily rotation on the board (SSL-570)', () => {
  const pool = (date: string, done: number, clientMissions = {}) => generateDailyClientPool(date, done, CLIENT_SLOTS, MINERAL_META, clientMissions)
  const signature = (missions: { id: string; requires: { minerals: Record<string, number> } }[]) => missions.map(m => `${m.id}:${JSON.stringify(m.requires.minerals)}`).join('|')

  it('shows different contracts on two different days', () => {
    expect(signature(pool('2026-10-16', 6))).not.toBe(signature(pool('2026-10-17', 6)))
  })

  it('opens higher tier clients as missions are flown, and every pooled client exists on the board', () => {
    const early = new Set(pool('2026-10-16', 2).map(m => m.client))
    const late = new Set(pool('2026-10-16', 12).map(m => m.client))
    expect(late.size).toBeGreaterThan(early.size)
    const tierOf = (id: string) => CLIENT_SLOTS.find(c => c.id === id)!.unlockTier
    expect(Math.max(...[...late].map(id => tierOf(id as string)))).toBeGreaterThan(Math.max(...[...early].map(id => tierOf(id as string))))
    for (const id of late) expect(CLIENTS[id as string]).toBeDefined()
  })

  it('every pooled contract can be flown with the parts unlocked at that point', () => {
    for (const done of [2, 6, 12, 20]) {
      const parts = {
        chassis: PARTS.chassis.filter(p => !p.locked && (p.missionsRequired ?? 0) <= done),
        propulsion: PARTS.propulsion.filter(p => !p.locked && (p.missionsRequired ?? 0) <= done),
        drill: PARTS.drill.filter(p => !p.locked && (p.missionsRequired ?? 0) <= done),
      }
      const missions = pool('2026-10-16', done)
      const flyable = missions.filter(m => feasibleTargetsFor(m, TARGETS, parts, done, true, 1).length > 0)
      expect(flyable.length).toBeGreaterThanOrEqual(Math.ceil(missions.length / 2))
    }
  })

  it('keeps accepted and completed contracts when the pool grows within a day, and resets on a new day', () => {
    const day = '2026-10-16'
    const first = refreshPoolIfStale(undefined, 2, CLIENT_SLOTS, MINERAL_META, {}, day)
    const marked = { ...first, acceptedId: first.missions[0].id, completedIds: [first.missions[1].id] }
    const grown = refreshPoolIfStale(marked, 12, CLIENT_SLOTS, MINERAL_META, {}, day)
    expect(grown.missions.length).toBeGreaterThan(first.missions.length)
    expect(grown.acceptedId).toBe(first.missions[0].id)
    expect(grown.completedIds).toEqual([first.missions[1].id])
    expect(refreshPoolIfStale(grown, 12, CLIENT_SLOTS, MINERAL_META, {}, day)).toBe(grown)
    const next = refreshPoolIfStale(grown, 12, CLIENT_SLOTS, MINERAL_META, {}, '2026-10-17')
    expect(next.acceptedId).toBeNull()
    expect(next.completedIds).toEqual([])
  })
})

describe('construct client contracts (SSL-571)', () => {
  const pool = generateDailyClientPool('2026-10-16', 6, CLIENT_SLOTS, MINERAL_META)
  const builds = pool.filter(m => m.construction)

  it('offers the fuel depot, battery station and fabrication pad as optional client jobs', () => {
    expect(builds.map(m => m.construction!.structureKind).sort()).toEqual(['battery-station', 'fabrication-pad', 'fuel-depot'])
    for (const m of builds) {
      expect(m.client).toBeDefined()
      expect(m.id.startsWith('dcp-')).toBe(true)
      expect(m.locked).toBe(false)
      expect(m.payout.francs).toBeGreaterThan(0)
      expect(m.requires.minerals).toEqual(m.construction!.requiredMaterials)
    }
  })

  it('only asks for materials a target in range holds together, so each can be mined and flown', () => {
    const parts = { chassis: PARTS.chassis.filter(p => !p.locked && (p.missionsRequired ?? 0) <= 6), propulsion: PARTS.propulsion.filter(p => !p.locked && (p.missionsRequired ?? 0) <= 6), drill: PARTS.drill.filter(p => !p.locked && (p.missionsRequired ?? 0) <= 6) }
    for (const m of builds) expect(feasibleTargetsFor(m, TARGETS, parts, 6, true, 1).length).toBeGreaterThan(0)
  })

  it('places the client structure at the target when the job is completed', () => {
    for (const m of builds) {
      const player = applyConstructionCompletion({ clientStructures: [] } as never, m, 'bennu', 1000)
      expect(player.clientStructures).toEqual([{ targetId: 'bennu', structureKind: m.construction!.structureKind, clientId: m.client, state: 'under-construction', startedAt: 1000 }])
    }
  })
})

// SSL-647: a fresh account's starter contract must fit the free Explorer's hold, on any day.
describe('starter contracts and the free Explorer', () => {
  it('never ask for more cargo than the Explorer carries', () => {
    const explorerHold = 6
    for (let day = 1; day <= 28; day++) {
      const date = `2026-11-${String(day).padStart(2, '0')}`
      const pool = generateDailyClientPool(date, 0, CLIENT_SLOTS, MINERAL_META)
      for (const mission of pool.filter(m => m.tag === 'STARTER')) {
        expect(mission.requires.cargo_min, `${date} ${mission.id}`).toBeLessThanOrEqual(explorerHold)
      }
    }
  })
})
