import { describe, expect, it } from 'vitest'
import { normalizeState } from '@/lib/game-state'
import { SIMPLIFY_2026_11 } from '@/lib/save-migrations'
import { storageCapacity } from '@/lib/systems/EconomySystem'

const old = {
  francs: 1000,
  stash: { iron: 5 },
  refinedGoods: { 'refined-gold': 2, 'refined-copper': 1 },
  refineryQueue: [{ recipeId: 'refined-uranium', startedAt: 1 }],
  laserCapacitorLevel: 2,
  subsurfaceExcavated: true,
  subsurfaceBuilt: ['mineral-vault', 'parts-locker'],
  priceAlerts: [{ id: 'a', mineralId: 'iron', target: 1 }],
  baseArrangement: ['hangar'],
  placed: ['launchpad', 'market', 'surface-silo'],
}

describe('cycle 11 simplification save migration', () => {
  const player = () => normalizeState({ player: old } as never).player as unknown as Record<string, unknown>

  it('turns refined goods and queued jobs into francs, once', () => {
    const p = player()
    expect(p.francs).toBe(1000 + 2 * 13_440_000 + 6_400_000 + 13_440_000)
    const again = normalizeState({ player: p } as never).player
    expect(again.francs).toBe(p.francs)
    expect(again.saveMigrations).toEqual([SIMPLIFY_2026_11])
  })

  it('refunds the laser capacitor as iron and keeps vault storage as a bonus', () => {
    const p = player() as never as ReturnType<typeof normalizeState>['player']
    expect(p.stash?.iron).toBe(5 + 18)
    expect(p.storageBonus).toBe(120)
    expect(storageCapacity(p)).toBeGreaterThanOrEqual(120)
  })

  it('drops the retired fields and the Exchange', () => {
    const p = player()
    for (const f of ['refinedGoods', 'refineryQueue', 'laserCapacitorLevel', 'subsurfaceBuilt', 'subsurfaceExcavated', 'priceAlerts', 'baseArrangement']) expect(f in p).toBe(false)
    expect(p.placed).not.toContain('market')
    expect(p.placed).toContain('surface-silo')
  })
})
