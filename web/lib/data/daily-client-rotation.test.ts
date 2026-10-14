import { describe, it, expect } from 'vitest'
import { CLIENT_SLOTS } from './clients'
import { MINERAL_META } from './minerals'
import { findTargetStructure } from './target-structures'
import { generateDailyClientPool, maxClientTier, openDailyClientOffers, refreshPoolIfStale } from './daily-client-missions'
import { buildRuntimeCatalog } from '../runtimeCatalog'
import { DEFAULT_STATE } from '../game-state'
import { MISSIONS, TARGETS } from '../data'

const days = Array.from({ length: 14 }, (_, i) => `2026-10-${String(i + 1).padStart(2, '0')}`)

describe('SSL-570 daily client rotation', () => {
  it('is stable within a day and rotates across days', () => {
    const a = generateDailyClientPool('2026-10-14', 2, CLIENT_SLOTS, MINERAL_META)
    const b = generateDailyClientPool('2026-10-14', 2, CLIENT_SLOTS, MINERAL_META)
    expect(a).toEqual(b)
    const c = generateDailyClientPool('2026-10-15', 2, CLIENT_SLOTS, MINERAL_META)
    expect(c.map(m => m.title)).not.toEqual(a.map(m => m.title))
  })

  it('keeps an existing pool for the same day', () => {
    const pool = refreshPoolIfStale(undefined, 2, CLIENT_SLOTS, MINERAL_META, {}, new Date(2026, 9, 14, 9))
    expect(refreshPoolIfStale(pool, 2, CLIENT_SLOTS, MINERAL_META, {}, new Date(2026, 9, 14, 22))).toBe(pool)
    expect(refreshPoolIfStale(pool, 2, CLIENT_SLOTS, MINERAL_META, {}, new Date(2026, 9, 15, 1)).date).toBe('2026-10-15')
  })

  it('opens client tiers as client affinity grows until all 12 are reachable', () => {
    expect(maxClientTier(2, {})).toBe(1)
    expect(maxClientTier(2, { 'helios-propulsion-depot': 3 })).toBe(2)
    expect(maxClientTier(2, { a: 6, b: 6 })).toBe(5)
    const early = new Set(generateDailyClientPool('2026-10-14', 2, CLIENT_SLOTS, MINERAL_META).map(m => m.client))
    expect(early.size).toBe(3)
    const late = new Set(generateDailyClientPool('2026-10-14', 2, CLIENT_SLOTS, MINERAL_META, { 'helios-propulsion-depot': 12 }).map(m => m.client))
    expect(CLIENT_SLOTS.length).toBe(12)
    expect(late.size).toBe(12)
  })

  it('drops completed offers from the board', () => {
    const pool = refreshPoolIfStale(undefined, 2, CLIENT_SLOTS, MINERAL_META)
    const first = pool.missions[0].id
    expect(openDailyClientOffers({ ...pool, completedIds: [first] }).some(m => m.id === first)).toBe(false)
  })

  it('replaces the static Free Ops contracts on the runtime board', () => {
    const player = { ...DEFAULT_STATE.player, freeOperations: true, missionsDone: 2 }
    const catalog = buildRuntimeCatalog({
      catalog: { targets: TARGETS, missions: MISSIONS, parts: { chassis: [], propulsion: [], drill: [] }, minerals: MINERAL_META, clients: {}, structures: [] },
      freeOperations: true,
      missionsDone: 2,
      player,
    })
    expect(catalog.missions.some(m => m.id.startsWith('dcp-'))).toBe(true)
    expect(catalog.missions.some(m => /^freeops-.*-freeops-/.test(m.id))).toBe(false)
    expect(catalog.missions.some(m => m.id === 'freeops-self-directed-mining')).toBe(true)
  })
})

describe('SSL-571 construct client jobs', () => {
  it('emits all three construct templates as optional client build jobs', () => {
    const kinds = new Set<string>()
    for (const day of days) {
      for (const m of generateDailyClientPool(day, 12, CLIENT_SLOTS, MINERAL_META)) {
        if (!m.construction) continue
        kinds.add(m.construction.structureKind)
        expect(m.client).toBeTruthy()
        expect(m.tag).toBe('CONSTRUCT')
        expect(m.requires.minerals).toEqual(m.construction.requiredMaterials)
        expect(findTargetStructure(m.construction.structureKind)).toBeDefined()
        expect(m.payout.francs).toBeGreaterThan(0)
      }
    }
    expect([...kinds].sort()).toEqual(['battery-station', 'fabrication-pad', 'fuel-depot'])
  })
})
