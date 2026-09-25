// Landnam game data — ownership model (SSL-317).
//
// Three tiers, resolved top-down:
//   1. The solar system is owned by the Collective (everyone, no one).
//   2. Each body (planet / asteroid / exoplanet) has one owner: the Collective
//      for the charted solar system, or the player who discovered it (TESS
//      exoplanets, NEOCP asteroids).
//   3. Each body is split into divisions (see biomes.ts). A division is held
//      by a client (predefined site rights), by a player who staked a Nav
//      Beacon claim, or falls back to the body owner.
//
// Body-level and division-level owners are data + player state; the
// OwnershipSystem resolves them and applies claims.

const COLLECTIVE_OWNER_ID = 'collective'
const COLLECTIVE_OWNER_NAME = 'The Collective'

export type OwnerKind = 'collective' | 'player' | 'client'

export interface Owner {
  kind: OwnerKind
  id: string
  name: string
}

export const COLLECTIVE_OWNER: Owner = { kind: 'collective', id: COLLECTIVE_OWNER_ID, name: COLLECTIVE_OWNER_NAME }

export interface TerritoryClaim {
  id: string
  targetId: string
  divisionId: string
  ownerId: string
  ownerKind: OwnerKind
  ownerName: string
  /** takeon structure id of the Nav Beacon that staked the claim, when applicable. */
  beaconStructureId?: string
  claimedAt: number
}

/** Client-held divisions for the charted solar system bodies. Site ids match SURFACE_SITES. */
export const CLIENT_DIVISION_HOLDINGS: readonly { targetId: string; divisionId: string; clientId: string; siteId: string }[] = [
  { targetId: 'moon', divisionId: 'moon:0-1', clientId: 'atlas-aggregate', siteId: 'moon-south-pole' },
  { targetId: 'mars', divisionId: 'mars:1-2', clientId: 'ferrum-orbital-construction', siteId: 'mars-arcadia' },
  { targetId: 'europa', divisionId: 'europa:1-0', clientId: 'ceres-volatiles-collective', siteId: 'europa-chaos' },
]
