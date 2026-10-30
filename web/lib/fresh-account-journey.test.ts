// SSL-647: the fast stand-in for "a fresh account plays the first minutes". It runs the real state
// normaliser, mission generator, launch gate and builder stats from an empty save, in about a second,
// so the first-run path is checked on every `make test` instead of by a 5 to 10 minute playthrough.
// It does not replace one rendered look at the Base; it catches the first-run blockers that a seeded
// preset hides (a contract the free Explorer cannot fly, a chip that disagrees with the launch gate).
import { describe, expect, it, vi } from 'vitest'

vi.mock('react', async importOriginal => {
  const actual = await importOriginal<typeof import('react')>()
  return { ...actual, useState: <T,>(initial: T) => [initial, () => undefined] as const }
})

import { normalizeState, type PartialSave } from './game-state'
import { STATIC_CATALOG } from './catalog'
import { STARTING_FRANCS } from './data/economy'
import { PARTS, validateBuild } from './data/parts'
import { CLIENT_SLOTS, MINERAL_META } from './data'
import { DEFAULT_COMPLEXITY_BANDS, DEFAULT_MISSION_TEMPLATES, FREE_OPS_START_MISSIONS_DONE, ONBOARDING_SEQUENCE_COUNT, generateFreeOpsMissionsFromRules, generateMissionsFromRules } from './data/mission-generator'
import { CUSTOMIZER_PARTS } from './data/shipCustomizer'
import { loadoutBonuses, rocketBuilderStats } from './launchpad/rocketBuilder'
import type { Mission, Target } from './data/types'

const fresh = normalizeState({} as PartialSave)
const explorer = fresh.rocket
const nearestTarget = (mission: Mission): Target => {
  const reachable = STATIC_CATALOG.targets.filter(target => target.orbit <= 4)
  return reachable.find(target => target.id === (mission as { targetId?: string }).targetId) ?? reachable[0]
}

describe('fresh account, first minutes', () => {
  it('starts in the tutorial with the free Explorer, starting francs and nothing placed', () => {
    expect(fresh.tutorial).toBe(true)
    expect(fresh.player.francs).toBe(STARTING_FRANCS)
    expect(fresh.player.missionsDone).toBe(0)
    expect(fresh.player.freeOperations).toBeFalsy()
    expect(fresh.player.placed ?? []).toEqual([])
    expect(explorer).toEqual({ chassis: 'hull-mk1', propulsion: 'ion-a1', drill: 'hand-drill' })
  })

  it('every guided contract the board can offer is launchable with the free Explorer and no purchase', () => {
    const guided = generateMissionsFromRules({ clients: CLIENT_SLOTS, minerals: MINERAL_META }, DEFAULT_COMPLEXITY_BANDS.length)
      .filter(mission => (mission.sequence ?? 1) <= ONBOARDING_SEQUENCE_COUNT)
    expect(guided.length).toBeGreaterThan(0)
    for (const mission of guided) {
      const check = validateBuild({ mission, target: nearestTarget(mission), rocket: explorer })
      expect(check.problems, `${mission.id} needs ${mission.requires.cargo_min}U`).toEqual([])
    }
  })

  it('the starter template can never ask for more cargo than the free Explorer carries', () => {
    const starter = DEFAULT_MISSION_TEMPLATES.find(template => template.id === 'starter-bulk')!
    const explorerCargo = PARTS.chassis.find(part => part.id === explorer.chassis)!.cargo!
    expect(starter.cargoRange[1]).toBeLessThanOrEqual(explorerCargo)
    for (let sequence = 1; sequence <= ONBOARDING_SEQUENCE_COUNT; sequence += 1) {
      for (let bias = 0; bias < 12; bias += 1) {
        const [mission] = generateMissionsFromRules({
          clients: CLIENT_SLOTS,
          minerals: MINERAL_META,
          complexityBands: [{ sequence, templateId: 'starter-bulk', mineralCount: 1, amountBias: bias, clientOffset: 0 }],
        }, 1)
        expect(mission.requires.cargo_min, `sequence ${sequence}, bias ${bias}`).toBeLessThanOrEqual(explorerCargo)
      }
    }
  })

  it('the Capacity and Range chips agree with the launch gate for every starter part', () => {
    const [mission] = generateMissionsFromRules({ clients: CLIENT_SLOTS, minerals: MINERAL_META }, 1)
    const target = nearestTarget(mission)
    for (const part of CUSTOMIZER_PARTS.filter(p => (p.unlockedAtMissions ?? 0) === 0)) {
      const installed = { [part.kind]: part.id } as Parameters<typeof rocketBuilderStats>[1]
      const stats = rocketBuilderStats(explorer, installed)
      const gate = validateBuild({ mission, target, rocket: explorer, loadoutBonus: loadoutBonuses(installed) })
      const chassisCargo = PARTS.chassis.find(p => p.id === explorer.chassis)!.cargo!
      const gateCapacity = chassisCargo + loadoutBonuses(installed).capacity
      expect(stats.capacity, part.id).toBe(gateCapacity)
      // The gate fails only when the chip itself is below the contract.
      expect(gate.problems.some(problem => problem.includes('cargo')), part.id).toBe(stats.capacity < mission.requires.cargo_min)
    }
  })

  it('the Free Ops board has contracts with a cargo target', () => {
    expect(FREE_OPS_START_MISSIONS_DONE).toBe(2)
    const board = generateFreeOpsMissionsFromRules({ clients: CLIENT_SLOTS, minerals: MINERAL_META })
    expect(board.length).toBeGreaterThan(0)
    for (const mission of board) expect(mission.requires.cargo_min).toBeGreaterThan(0)
  })
})
