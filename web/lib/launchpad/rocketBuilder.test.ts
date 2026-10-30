import { describe, expect, it } from 'vitest'
import { validateBuild } from '@/lib/data/parts'
import { MISSIONS, TARGETS } from '@/lib/data'
import { applyConfirmShipCustomizerBuild } from '@/lib/systems/EconomySystem'
import type { GameState } from '@/lib/game-types'
import {
  BUILDER_SLOTS,
  allPartsForSlot,
  partEffectLabel,
  builderLandscape,
  installSlot,
  nextPartId,
  partIdForSlot,
  loadoutBonuses,
  rocketBuilderStats,
  type BuilderLoadout,
} from './rocketBuilder'

const rocket = { chassis: 'hull-mk1', propulsion: 'ion-a1', drill: 'hand-drill' }

describe('rocket builder loadout', () => {
  it('cycles engine parts and keeps the mining laser off the booster key', () => {
    const engine = BUILDER_SLOTS[0]
    const laser = BUILDER_SLOTS[3]
    const empty: BuilderLoadout = {}
    const first = nextPartId(engine, empty, 0)
    expect(first).toBe('ion-thruster-t1')
    const fitted = installSlot(empty, engine, first!)
    expect(partIdForSlot(fitted, engine)).toBe('ion-thruster-t1')
    expect(nextPartId(engine, fitted, 0)).toBe('pulse-thruster-t1')

    const withLaser = installSlot(fitted, laser, 'focused-laser-t2')
    expect(withLaser['mining-laser']).toBe('focused-laser-t2')
    expect(withLaser.booster).toBeUndefined()
    expect(partIdForSlot(withLaser, BUILDER_SLOTS[4])).toBeUndefined()
  })

  it('raises capacity, range and laser charge from the fitted parts', () => {
    const bare = rocketBuilderStats(rocket, {})
    expect(bare).toEqual({ capacity: 6, range: 5, laser: 6 })
    const fitted = rocketBuilderStats(rocket, {
      engine: 'ion-thruster-t1',
      'fuel-stage': 'kerosene-stage-t1',
      payload: 'cargo-payload-t1',
      booster: 'vulcan-booster-t1',
      'mining-laser': 'focused-laser-t2',
    })
    expect(fitted.capacity).toBeGreaterThan(bare.capacity)
    expect(fitted.range).toBeGreaterThan(bare.range)
    expect(fitted.laser).toBeGreaterThan(bare.laser)
  })

  it('saves the mining laser through the existing customizer confirm', () => {
    const state = { player: { francs: 80_000_000, shipCustomizerParts: {} } } as GameState
    const next = installSlot({}, BUILDER_SLOTS[3], 'focused-laser-t2')
    const result = applyConfirmShipCustomizerBuild(state, next, {})
    expect(result.ok).toBe(true)
    expect(result.state.player.shipCustomizerParts).toMatchObject({ 'mining-laser': 'focused-laser-t2' })
    expect(result.state.player.francs).toBe(80_000_000 - 7_500_000)
  })

  it('paints destination landscapes as a dusk sky, never a flat grey wash or orange', () => {
    for (const target of [
      { id: 'eros', type: 'asteroid' as const },
      { id: 'mars', type: 'planet' as const },
      { id: 'europa', type: 'planet' as const, archetype: 'icy' as const },
    ]) {
      const scene = builderLandscape(target)
      for (const color of [scene.skyTop, scene.skyHorizon]) {
        const [r, g, b] = color.match(/\d+/g)!.map(Number)
        // Dusk, not a near-white wash: the old 84% paper lift read as grey bars around the panels.
        expect((r + g + b) / 3).toBeLessThan(150)
        expect(r > b + 28 && r >= g).toBe(false)
      }
    }
    expect(builderLandscape({ id: 'eros', type: 'asteroid' }).paletteId).not.toBe(
      builderLandscape({ id: 'mars', type: 'planet' }).paletteId,
    )
  })
})

describe('rocket builder choices', () => {
  it('lists every part a slot can hold and labels what each adds', () => {
    for (const slot of BUILDER_SLOTS) {
      const parts = allPartsForSlot(slot)
      expect(parts.length).toBeGreaterThan(0)
      for (const part of parts) expect(partEffectLabel(slot, part)).toMatch(/range|capacity|Laser/)
    }
    expect(allPartsForSlot(BUILDER_SLOTS[3]).every(part => part.id.includes('laser'))).toBe(true)
  })
})

describe('launch review counts what the builder chips show (SSL-647)', () => {
  it('a fitted cargo hold lifts the minimum check by the same units the Capacity chip adds', () => {
    const cargo = BUILDER_SLOTS[2]
    const best = allPartsForSlot(cargo).at(-1)!
    const loadout = installSlot({}, cargo, best.id)
    const bonus = loadoutBonuses(loadout)
    expect(bonus.capacity).toBe(rocketBuilderStats(rocket, loadout).capacity - rocketBuilderStats(rocket, {}).capacity)
    expect(bonus.capacity).toBeGreaterThan(0)
    const mission = { ...MISSIONS[0], requires: { ...MISSIONS[0].requires, cargo_min: rocketBuilderStats(rocket, loadout).capacity } }
    const target = TARGETS.find(t => t.id === 'mars')!
    const without = validateBuild({ mission, target, rocket })
    const withHold = validateBuild({ mission, target, rocket, loadoutBonus: bonus })
    expect(without.problems.some(p => p.includes('cargo'))).toBe(true)
    expect(withHold.problems.some(p => p.includes('cargo'))).toBe(false)
  })
})
