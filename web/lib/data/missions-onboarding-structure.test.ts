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

const SR1_CARGO = ROCKET_MODELS.find(r => r.id === 'sr1')!.stats.cargo
const SR2_CARGO = ROCKET_MODELS.find(r => r.id === 'sr2')!.stats.cargo

describe('Onboarding mission structure (M1-M3)', () => {
  it('removes the cut self-directed "Independent Prospect" mission from the onboarding ladder entirely', () => {
    expect(MISSIONS.find(m => m.id === 'lnm_m3_custom_mining')).toBeUndefined()
  })

  it('M1 presents more than one client/mission choice, not a single railroaded mission', () => {
    const m1 = MISSIONS.filter(m => m.sequence === 1)
    expect(m1.length).toBeGreaterThan(1)
    const clients = new Set(m1.map(m => m.client))
    expect(clients.size).toBeGreaterThan(1)
  })

  it('M2 presents more than one client/mission choice', () => {
    const m2 = MISSIONS.filter(m => m.sequence === 2)
    expect(m2.length).toBeGreaterThan(1)
  })

  it('every M2 option requires more cargo than the Explorer (SR1) can carry, forcing a Prospector (SR2) purchase', () => {
    expect(SR1_CARGO).toBeLessThan(SR2_CARGO)
    const m2 = MISSIONS.filter(m => m.sequence === 2)
    expect(m2.length).toBeGreaterThan(0)
    for (const mission of m2) {
      expect(mission.requires.cargo_min).toBeGreaterThan(SR1_CARGO)
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
})
