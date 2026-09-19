import { describe, expect, it } from 'vitest'
import type { TerritoryClaim } from '@/lib/data'
import {
  bodyOwner,
  mergeTerritoryClaims,
  releaseClaimForBeacon,
  resolveBodyOwnership,
  stakeDivision,
  type OwnershipPlayer,
} from './OwnershipSystem'

const NOW = 5_000_000
const EXO = { id: 'exo-toi-1', type: 'exoplanet' as const, archetype: 'S' as const, planetRadiusEarth: 1.2, periodDays: 40, starTeffK: 3500 }

function player(overrides: Partial<OwnershipPlayer> = {}): OwnershipPlayer {
  return { id: 'p1', name: 'Liam', ...overrides }
}

describe('body ownership', () => {
  it('solar system bodies belong to the Collective', () => {
    expect(bodyOwner('mars', player()).kind).toBe('collective')
  })

  it('a discovered exoplanet belongs to its discoverer', () => {
    const p = player({ discoveredExoplanetTargets: { [EXO.id]: EXO } })
    const owner = bodyOwner(EXO.id, p)
    expect(owner).toEqual({ kind: 'player', id: 'p1', name: 'Liam' })
    const body = resolveBodyOwnership(EXO, p, [], NOW)
    expect(body.divisions.every(d => d.mine && d.via === 'discovery')).toBe(true)
  })

  it('client site rights hold their division on Mars', () => {
    const body = resolveBodyOwnership({ id: 'mars', type: 'planet' }, player(), [], NOW)
    const arcadia = body.divisions.find(d => d.division.id === 'mars:1-2')!
    expect(arcadia.owner.kind).toBe('client')
    expect(arcadia.via).toBe('client-site')
    expect(body.divisions.filter(d => d.owner.kind === 'collective')).toHaveLength(7)
  })
})

describe('claims', () => {
  it('stakes an unclaimed division and refuses a client-held one', () => {
    const ok = stakeDivision(player(), 'mars', 'mars:0-0', { beaconStructureId: 'b1', now: NOW })
    expect(ok.ok).toBe(true)
    expect(ok.claims).toHaveLength(1)
    const denied = stakeDivision(player(), 'mars', 'mars:1-2', { now: NOW })
    expect(denied.ok).toBe(false)
  })

  it('earliest claim wins across players', () => {
    const theirs: TerritoryClaim = { id: 'c2', targetId: 'mars', divisionId: 'mars:0-1', ownerId: 'p2', ownerKind: 'player', ownerName: 'Ada', claimedAt: NOW - 10 }
    const denied = stakeDivision(player(), 'mars', 'mars:0-1', { remoteClaims: [theirs], now: NOW })
    expect(denied.ok).toBe(false)
    expect(denied.reason).toContain('Ada')
    const mine: TerritoryClaim = { ...theirs, id: 'c1', ownerId: 'p1', ownerName: 'Liam', claimedAt: NOW - 20 }
    expect(mergeTerritoryClaims([mine], [theirs])[0].ownerId).toBe('p1')
  })

  it('demolishing the beacon releases the claim', () => {
    const staked = stakeDivision(player(), 'mars', 'mars:0-0', { beaconStructureId: 'b1', now: NOW })
    expect(releaseClaimForBeacon(staked.claims, 'b1')).toHaveLength(0)
    expect(releaseClaimForBeacon(staked.claims, 'other')).toHaveLength(1)
  })
})
