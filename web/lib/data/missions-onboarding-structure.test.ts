/**
 * Review coverage for "Segment M1-M3 onboarding: distinct mission types per
 * milestone, with client/mission choice and affinity"
 * (segment-m1-m3-onboarding-mission-types).
 *
 * Exercises the ticket's own acceptance criteria directly against the real
 * production data (MISSIONS, ROCKET_MODELS) rather than a mirrored
 * fixture, so a future change to mission-generator.ts or missions.ts that
 * silently regresses one of these guarantees fails a test instead of
 * shipping quietly.
 */

import { describe, it, expect } from 'vitest'
import { MISSIONS } from '@/lib/data/missions'
import { ROCKET_MODELS } from '@/lib/data/rockets'
import { tutorialClientMissionOptions } from '@/lib/data/mission-generator'

const EXPLORER_CARGO = ROCKET_MODELS.find(r => r.name === 'Explorer')!.stats.cargo
const PROSPECTOR_CARGO = ROCKET_MODELS.find(r => r.name === 'Prospector')!.stats.cargo

describe('Onboarding mission structure (M1-M3)', () => {
  it('removes the cut self-directed "Independent Prospect" mission from the onboarding ladder entirely', () => {
    expect(MISSIONS.find(m => m.id === 'lnm_m3_custom_mining')).toBeUndefined()
  })

  it('M1 presents exactly two competing client choices', () => {
    const m1 = MISSIONS.filter(m => m.sequence === 1)
    expect(m1).toHaveLength(2)
    expect(new Set(m1.map(m => m.title))).toEqual(new Set(['Baseline Extraction']))
    const clients = new Set(m1.map(m => m.client))
    expect(clients.size).toBe(2)
    expect(Math.max(...m1.map(m => m.payout.francs)) / Math.min(...m1.map(m => m.payout.francs))).toBeLessThanOrEqual(1.1)
  })

  it('M2 presents exactly two competing client choices', () => {
    const m2 = MISSIONS.filter(m => m.sequence === 2)
    expect(m2).toHaveLength(2)
    expect(new Set(m2.map(m => m.title))).toEqual(new Set(['Heavy Haul']))
    expect(new Set(m2.map(m => m.client)).size).toBe(2)
    expect(Math.max(...m2.map(m => m.payout.francs)) / Math.min(...m2.map(m => m.payout.francs))).toBeLessThanOrEqual(1.1)
  })

  it('every M2 option requires more cargo than Explorer can carry, forcing a Prospector purchase', () => {
    expect(EXPLORER_CARGO).toBeLessThan(PROSPECTOR_CARGO)
    const m2 = MISSIONS.filter(m => m.sequence === 2)
    expect(m2.length).toBeGreaterThan(0)
    for (const mission of m2) {
      expect(mission.requires.cargo_min).toBeGreaterThan(EXPLORER_CARGO)
    }
  })

  it('M3 presents a short list of clients offering transport work, each a two-leg mine-then-deliver job', () => {
    const m3 = MISSIONS.filter(m => m.sequence === 3)
    expect(m3.length).toBeGreaterThanOrEqual(2)
    const clients = new Set(m3.map(m => m.client))
    expect(clients.size).toBe(m3.length)
    for (const mission of m3) {
      expect(mission.tag).toBe('TRANSPORT')
      expect(mission.deliveryTargetId).toBeTruthy()
      expect(mission.deliveryTargetId).not.toBe(mission.targetId)
    }
  })

  it('mission type per milestone is enforced by template/tag, not just flavor text', () => {
    const m1 = MISSIONS.filter(m => m.sequence === 1)
    const m3 = MISSIONS.filter(m => m.sequence === 3)
    // M1 is plain mining/bulk work — no two-leg delivery requirement yet.
    for (const mission of m1) {
      expect(mission.deliveryTargetId).toBeFalsy()
    }
    // M3 is transport-tagged and structurally two-leg (asserted above too).
    for (const mission of m3) {
      expect(mission.tag).toBe('TRANSPORT')
    }
  })

  it('runtime tutorial selection trims legacy extras to the closest distinct-client pair', () => {
    const m1 = MISSIONS.filter(m => m.sequence === 1)
    const legacyExtras = [m1[0], { ...m1[0], id: 'legacy-same-client' }, ...m1.slice(1)]
    const options = tutorialClientMissionOptions(legacyExtras, 1)

    expect(options).toHaveLength(2)
    expect(new Set(options.map(m => m.client)).size).toBe(2)
    expect(options.map(m => m.id)).toEqual(m1.map(m => m.id))
  })
})
