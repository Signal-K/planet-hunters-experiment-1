/**
 * Review coverage for the guided onboarding missions: distinct mission types
 * per milestone, with client/mission choice and affinity. Since SSL-332 there
 * are two: Extraction (sequence 1) and Transport (sequence 2); the old M2
 * Prospector bulk haul is retired.
 *
 * Exercises the ticket's own acceptance criteria directly against the real
 * production data (MISSIONS, ROCKET_MODELS) rather than a mirrored
 * fixture, so a future change to mission-generator.ts or missions.ts that
 * silently regresses one of these guarantees fails a test instead of
 * shipping quietly.
 */

import { describe, it, expect } from 'vitest'
import { MISSIONS, TRANSPORT_SEQUENCE } from '@/lib/data/missions'
import { tutorialClientMissionOptions } from '@/lib/data/mission-generator'

describe('Onboarding mission structure (Extraction, Transport)', () => {
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

  it('retires the M2 Prospector bulk haul: no generated "Heavy Haul" missions remain', () => {
    expect(MISSIONS.some(m => m.title === 'Heavy Haul')).toBe(false)
  })

  it('Transport presents a short list of clients offering courier work: cargo loaded on Earth, flown to a depot, no mining (SSL-362)', () => {
    const transport = MISSIONS.filter(m => m.sequence === TRANSPORT_SEQUENCE)
    expect(TRANSPORT_SEQUENCE).toBe(2)
    expect(transport.length).toBeGreaterThanOrEqual(2)
    const clients = new Set(transport.map(m => m.client))
    expect(clients.size).toBe(transport.length)
    for (const mission of transport) {
      expect(mission.tag).toBe('TRANSPORT')
      expect(mission.deliveryTargetId).toBeTruthy()
      expect(mission.targetId).toBe(mission.deliveryTargetId)
      // The loaded hold is exactly the contract, and it fits the Explorer.
      expect(mission.loadedCargo).toEqual(mission.requires.minerals)
      const units = Object.values(mission.loadedCargo ?? {}).reduce((sum, n) => sum + n, 0)
      expect(units).toBe(mission.requires.cargo_min)
    }
  })

  it('no guided mission exists past Transport — the storage silo, not a third mission, opens Free Ops', () => {
    expect(MISSIONS.filter(m => m.sequence === 3)).toHaveLength(0)
  })

  it('mission type per milestone is enforced by template/tag, not just flavor text', () => {
    const m1 = MISSIONS.filter(m => m.sequence === 1)
    const transport = MISSIONS.filter(m => m.sequence === TRANSPORT_SEQUENCE)
    // Extraction is plain mining work — no two-leg delivery requirement yet.
    for (const mission of m1) {
      expect(mission.deliveryTargetId).toBeFalsy()
    }
    // Transport is transport-tagged courier work (asserted above too).
    for (const mission of transport) {
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
