import { describe, it, expect } from 'vitest'
import { missionTypePrimer, isMissionBoardMission, isOwnProgramMission, partitionByOwner, OWN_PROGRAM_CLIENT_ID } from './mission-primers'
import { MISSIONS, SELF_DIRECTED_MINING_MISSION_ID } from './missions'
import type { Mission } from './types'

const base: Mission = {
  id: 'test', title: 'Test', brief: '', client: 'atlas-aggregate', tag: 'STARTER', difficulty: 'L1',
  locked: false, sequence: 1, targetId: 'bennu',
  requires: { minerals: {}, cargo_min: 0, drill_tier: 1, max_orbit: 3 },
  payout: { francs: 1, affinity: 0 },
}

describe('missionTypePrimer', () => {
  it('reads a plain client order as a mine-and-return run', () => {
    const primer = missionTypePrimer(base)
    expect(primer.label).toBe('Baseline extraction')
    expect(primer.steps).toEqual(['Launch', 'Mine', 'Return'])
    expect(primer.owner).toBe('client')
  })

  it('names the second onboarding milestone as a heavier haul', () => {
    const primer = missionTypePrimer({ ...base, sequence: 2 })
    expect(primer.label).toBe('Heavy haul')
    expect(primer.summary).toContain('larger Prospector')
  })

  it('reads a delivery leg as a two-stop job', () => {
    const primer = missionTypePrimer({ ...base, deliveryTargetId: 'vesta' })
    expect(primer.label).toBe('Two-stop delivery')
    expect(primer.steps).toEqual(['Mine', 'Deliver', 'Return'])
  })

  it('reads a construction plan as a build job', () => {
    const primer = missionTypePrimer({
      ...base,
      construction: { structureKind: 'fuel-depot', requiredMaterials: { hydrogen: 8 }, placementMode: 'confirm', buildTimeMs: 1 },
    })
    expect(primer.label).toBe('Client build job')
    expect(primer.steps).toContain('Build')
  })

  it('separates a station mapping scan from a rover landing', () => {
    const scan = missionTypePrimer({
      ...base,
      survey: { scanRequired: true, scanCount: 3, scanSource: 'station', depositsToMap: 2, revealsMinerals: true, revealsLandmarks: [], unlocksLanding: true },
    })
    expect(scan.label).toBe('Mapping scan')

    const rover = missionTypePrimer({
      ...base,
      survey: { scanRequired: true, scanCount: 1, scanSource: 'rover', depositsToMap: 1, revealsMinerals: true, revealsLandmarks: [], unlocksLanding: true, onWorldVehicle: 'starter-rover' },
    })
    expect(rover.label).toBe('Rover landing')
  })

  it('prefers the payload type over the delivery leg', () => {
    const primer = missionTypePrimer({
      ...base,
      deliveryTargetId: 'vesta',
      payload: { type: 'rover', name: 'Scout', cargoCost: 4 },
    })
    expect(primer.label).toBe('Rover drop')
  })
})

// Own-program copy may say "no client"; what it must never do is attribute the
// work *to* a client.
const CLIENT_ATTRIBUTION = /(the|a|their|its) client|client'?s\b/i

describe('own-program missions', () => {
  // The legacy pseudo-client remains recognized for active saves created
  // before STS-582 removed that catalog residue.
  const telescope: Mission = {
    ...base,
    id: 'story-transit-telescope-launch',
    title: 'Launch Transit Telescope',
    client: OWN_PROGRAM_CLIENT_ID,
    tag: 'STORY',
    payload: { type: 'satellite', name: 'Transit Telescope', cargoCost: 0 },
  }

  it('treats a satellite launch as the player\'s own operation', () => {
    expect(isOwnProgramMission(telescope)).toBe(true)
    const primer = missionTypePrimer(telescope)
    expect(primer.label).toBe('Satellite launch')
    expect(primer.owner).toBe('self')
    expect(primer.summary).not.toMatch(CLIENT_ATTRIBUTION)
  })

  it('treats a clientless Free Ops run as the player\'s own operation', () => {
    const selfDirected = MISSIONS.find(m => m.id === SELF_DIRECTED_MINING_MISSION_ID)!
    expect(isOwnProgramMission(selfDirected)).toBe(true)
    expect(missionTypePrimer(selfDirected).label).toBe('Self-directed run')
  })

  it('leaves real client contracts alone', () => {
    expect(isOwnProgramMission(base)).toBe(false)
  })

  it('keeps owned operations off the Free Ops Mission Board', () => {
    expect(isMissionBoardMission(telescope, true)).toBe(false)
    expect(isMissionBoardMission({ ...telescope, client: undefined }, true)).toBe(false)
    expect(isMissionBoardMission(base, true)).toBe(true)
    expect(isMissionBoardMission(telescope, false)).toBe(true)
  })

  it('never mentions a client in own-program copy', () => {
    const ownBuild = missionTypePrimer({
      ...base,
      client: undefined,
      construction: { structureKind: 'fuel-depot', requiredMaterials: {}, placementMode: 'confirm', buildTimeMs: 1 },
    })
    expect(ownBuild.owner).toBe('self')
    expect(ownBuild.label).toBe('Own infrastructure build')
    expect(ownBuild.summary).not.toMatch(CLIENT_ATTRIBUTION)
  })
})

describe('primer coverage', () => {
  // The primer is what replaces reading the long brief, so every mission the
  // board can actually show must resolve to one — a type with no primer would
  // leave the board's lower half empty again.
  it('gives every catalog mission a short, legible primer', () => {
    for (const mission of MISSIONS) {
      const primer = missionTypePrimer(mission)
      expect(primer.summary.length).toBeGreaterThan(0)
      expect(primer.summary.split(' ').length).toBeLessThanOrEqual(25)
      expect(primer.steps.length).toBeGreaterThanOrEqual(3)
      if (primer.owner === 'self') expect(primer.summary).not.toMatch(CLIENT_ATTRIBUTION)
    }
  })
})

describe('partitionByOwner', () => {
  const clientOrder: Mission = { ...base, id: 'client-order' }
  const selfDirected: Mission = { ...base, id: 'self', client: undefined }
  const ownBuild: Mission = {
    ...base, id: 'own-refinery', client: OWN_PROGRAM_CLIENT_ID,
    construction: {
      structureKind: 'refinery', requiredMaterials: { iron: 10 },
      placementMode: 'confirm', buildTimeMs: 1000,
    },
  }
  const satellite: Mission = {
    ...base, id: 'sat',
    payload: { type: 'satellite', name: 'Transit Telescope', cargoCost: 1 },
  }

  it('splits client work from the player’s own program', () => {
    const { client, own } = partitionByOwner(
      [clientOrder, selfDirected, ownBuild, satellite],
      m => m,
    )

    expect(client.map(m => m.id)).toEqual(['client-order'])
    // A satellite launch is own-program even though it carries a client id —
    // it deploys the player's asset, so it must never sit under client work.
    expect(own.map(m => m.id)).toEqual(['self', 'own-refinery', 'sat'])
  })

  it('preserves the incoming order within each group', () => {
    const a: Mission = { ...base, id: 'a' }
    const b: Mission = { ...base, id: 'b' }
    const { client } = partitionByOwner([b, selfDirected, a], m => m)
    expect(client.map(m => m.id)).toEqual(['b', 'a'])
  })

  it('returns empty groups rather than undefined when one side has nothing', () => {
    expect(partitionByOwner([clientOrder], m => m).own).toEqual([])
    expect(partitionByOwner([], (m: Mission) => m).client).toEqual([])
  })

  it('works over board card models, not just bare missions', () => {
    const cards = [{ mission: clientOrder, payout: 10 }, { mission: ownBuild, payout: 0 }]
    const { client, own } = partitionByOwner(cards, c => c.mission)
    expect(client).toHaveLength(1)
    expect(own[0].mission.id).toBe('own-refinery')
  })
})
