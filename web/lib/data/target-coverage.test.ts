import { describe, it, expect } from 'vitest'
import { DEFAULT_MISSION_TEMPLATES, DEFAULT_COMPLEXITY_BANDS } from './mission-generator'
import { TARGETS, compatibleTargetsFor } from './targets'
import { MINERAL_META } from './minerals'
import type { Mission, MissionTemplate } from './types'

// Guardrail against the 2026-07-14 class of bug: mission templates declared
// mineral requirements (mineralKeys/mineralCount) with zero relationship to
// what targets.ts actually contained, so several combinations the generator
// could legitimately produce had no real, pickable target — the mission
// board showed contracts nobody could ever complete.
//
// This test doesn't sample actual generated missions (the pre-existing
// "every generated mission has >=1 compatible target" test does that, and
// only catches whatever combinations happened to be seeded that day). It
// instead enumerates the full combinatorial space a template CAN produce —
// every mineralCount-sized subset of its mineralKeys, at its declared
// orbitMax — and asserts every one of them resolves to a real target. If a
// future template or mineral edit reopens this gap, this fails immediately
// instead of waiting for someone to screenshot a "0 targets" mission card.

function deliveryEligibleMineralKeys(template: MissionTemplate): string[] {
  if (template.tag === 'CONSTRUCT') return template.mineralKeys
  const filtered = template.mineralKeys.filter(key => !MINERAL_META[key]?.earthAbundant)
  return filtered.length > 0 ? filtered : template.mineralKeys
}

function combinations<T>(items: T[], size: number): T[][] {
  if (size === 0) return [[]]
  if (items.length < size) return []
  const [head, ...rest] = items
  const withHead = combinations(rest, size - 1).map(combo => [head, ...combo])
  const withoutHead = combinations(rest, size)
  return [...withHead, ...withoutHead]
}

function fakeMissionFor(minerals: string[], orbitMax: number, drillTier: number): Mission {
  return {
    id: 'coverage-probe',
    title: 'Coverage probe',
    brief: '',
    tag: 'BULK',
    difficulty: 'L1',
    locked: false,
    sequence: 1,
    requires: {
      minerals: Object.fromEntries(minerals.map(m => [m, 1])),
      cargo_min: 1,
      drill_tier: drillTier,
      max_orbit: orbitMax,
    },
    payout: { francs: 0, affinity: 0 },
  }
}

describe('target coverage — every generator-producible mineral combination has a real target', () => {
  const templatesById = new Map(DEFAULT_MISSION_TEMPLATES.map(t => [t.id, t]))
  const mineralCountsByTemplate = new Map<string, Set<number>>()
  for (const band of DEFAULT_COMPLEXITY_BANDS) {
    const set = mineralCountsByTemplate.get(band.templateId) ?? new Set<number>()
    set.add(band.mineralCount)
    mineralCountsByTemplate.set(band.templateId, set)
  }

  for (const [templateId, mineralCounts] of mineralCountsByTemplate) {
    const template = templatesById.get(templateId)
    if (!template) continue
    const eligibleKeys = deliveryEligibleMineralKeys(template)

    for (const mineralCount of mineralCounts) {
      const combos = combinations(eligibleKeys, mineralCount)
      if (combos.length === 0) continue

      for (const combo of combos) {
        it(`${templateId} requiring {${combo.join(', ')}} (orbit ≤ ${template.orbitMax}) has ≥ 1 real target`, () => {
          const probe = fakeMissionFor(combo, template.orbitMax, template.drillTierMin)
          const compatible = compatibleTargetsFor(probe, TARGETS)
          expect(compatible.length).toBeGreaterThan(0)
        })
      }
    }
  }
})
