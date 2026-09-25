// Ownership resolution (SSL-317).
//
// Tier 1: the solar system belongs to the Collective.
// Tier 2: a body belongs to the Collective unless a player discovered it
//         (TESS exoplanets live in `discoveredExoplanetTargets`).
// Tier 3: a body's divisions are held by a client (predefined site rights),
//         by a player claim (Nav Beacon), or fall back to the body owner.
//
// Pure functions over plain state so screens, takeon hosts and PocketBase
// sync all agree without a shared singleton.

import {
  CLIENT_DIVISION_HOLDINGS,
  CLIENTS,
  COLLECTIVE_OWNER,
  divisionsForTarget,
  type BiosphereSeed,
  type LifeStage,
  type Owner,
  type SurfaceTarget,
  type TargetDivision,
  type TerritoryClaim,
  lifeStageForTarget,
} from '@/lib/data'

export interface OwnershipPlayer {
  id: string
  name: string
  discoveredExoplanetTargets?: Record<string, SurfaceTarget>
  territoryClaims?: TerritoryClaim[]
  biosphereSeeds?: Record<string, BiosphereSeed>
}

export interface DivisionOwnership {
  division: TargetDivision
  owner: Owner
  /** True when the current player holds it. */
  mine: boolean
  /** Source of the holding, for UI copy. */
  via: 'collective' | 'discovery' | 'client-site' | 'claim'
}

export interface BodyOwnership {
  targetId: string
  owner: Owner
  lifeStage: LifeStage
  divisions: DivisionOwnership[]
}

function playerOwner(player: Pick<OwnershipPlayer, 'id' | 'name'>): Owner {
  return { kind: 'player', id: player.id, name: player.name }
}

function clientOwner(clientId: string): Owner {
  const client = CLIENTS[clientId]
  return { kind: 'client', id: clientId, name: client?.name ?? clientId }
}

/** Body-level owner: discoverer if any, else the Collective. */
export function bodyOwner(targetId: string, player: OwnershipPlayer, otherClaims: TerritoryClaim[] = []): Owner {
  if (player.discoveredExoplanetTargets?.[targetId]) return playerOwner(player)
  // Another player's discovery shows up as a body-level claim with an empty division.
  const discovery = otherClaims.find(c => c.targetId === targetId && c.divisionId === '')
  if (discovery) return { kind: discovery.ownerKind, id: discovery.ownerId, name: discovery.ownerName }
  return COLLECTIVE_OWNER
}

/** Merge local + remote claims; the earliest claim on a division wins. */
export function mergeTerritoryClaims(...sources: (TerritoryClaim[] | undefined)[]): TerritoryClaim[] {
  const byDivision = new Map<string, TerritoryClaim>()
  for (const list of sources) {
    for (const claim of list ?? []) {
      const key = `${claim.targetId}|${claim.divisionId}`
      const existing = byDivision.get(key)
      if (!existing || claim.claimedAt < existing.claimedAt) byDivision.set(key, claim)
    }
  }
  return [...byDivision.values()].sort((a, b) => a.claimedAt - b.claimedAt)
}

function resolveDivisionOwner(
  division: TargetDivision,
  body: Owner,
  claims: TerritoryClaim[],
  playerId: string,
): DivisionOwnership {
  const holding = CLIENT_DIVISION_HOLDINGS.find(h => h.divisionId === division.id)
  if (holding) {
    const owner = clientOwner(holding.clientId)
    return { division, owner, mine: false, via: 'client-site' }
  }
  const claim = claims.find(c => c.divisionId === division.id)
  if (claim) {
    const owner: Owner = { kind: claim.ownerKind, id: claim.ownerId, name: claim.ownerName }
    return { division, owner, mine: claim.ownerId === playerId, via: 'claim' }
  }
  return { division, owner: body, mine: body.kind === 'player' && body.id === playerId, via: body.kind === 'player' ? 'discovery' : 'collective' }
}

export function resolveBodyOwnership(
  target: SurfaceTarget,
  player: OwnershipPlayer,
  remoteClaims: TerritoryClaim[] = [],
  now = Date.now(),
): BodyOwnership {
  const claims = mergeTerritoryClaims(player.territoryClaims, remoteClaims)
  const owner = bodyOwner(target.id, player, claims)
  const lifeStage = lifeStageForTarget(target, player.biosphereSeeds?.[target.id], now)
  const divisions = divisionsForTarget(target, 6, lifeStage).map(d => resolveDivisionOwner(d, owner, claims, player.id))
  return { targetId: target.id, owner, lifeStage, divisions }
}

export interface ClaimResult {
  ok: boolean
  reason?: string
  claim?: TerritoryClaim
  claims: TerritoryClaim[]
}

/** Stake a division for the player. Fails if a client holds it or another player got there first. */
export function stakeDivision(
  player: OwnershipPlayer,
  targetId: string,
  divisionId: string,
  opts: { beaconStructureId?: string; remoteClaims?: TerritoryClaim[]; now?: number } = {},
): ClaimResult {
  const now = opts.now ?? Date.now()
  const claims = mergeTerritoryClaims(player.territoryClaims, opts.remoteClaims)
  if (CLIENT_DIVISION_HOLDINGS.some(h => h.divisionId === divisionId)) {
    return { ok: false, reason: 'A client holds this division under site rights.', claims: player.territoryClaims ?? [] }
  }
  const existing = claims.find(c => c.divisionId === divisionId)
  if (existing && existing.ownerId !== player.id) {
    return { ok: false, reason: `Already held by ${existing.ownerName}.`, claims: player.territoryClaims ?? [] }
  }
  if (existing) return { ok: true, claim: existing, claims: player.territoryClaims ?? [] }
  const claim: TerritoryClaim = {
    id: `claim:${player.id}:${divisionId}:${now}`,
    targetId,
    divisionId,
    ownerId: player.id,
    ownerKind: 'player',
    ownerName: player.name,
    beaconStructureId: opts.beaconStructureId,
    claimedAt: now,
  }
  return { ok: true, claim, claims: [...(player.territoryClaims ?? []), claim] }
}

/** Drop the claim tied to a demolished beacon, if any. */
export function releaseClaimForBeacon(claims: TerritoryClaim[] | undefined, beaconStructureId: string): TerritoryClaim[] {
  return (claims ?? []).filter(c => c.beaconStructureId !== beaconStructureId)
}

export function ownerLabel(owner: Owner): string {
  if (owner.kind === 'collective') return 'The Collective'
  if (owner.kind === 'client') return owner.name
  return owner.name
}
