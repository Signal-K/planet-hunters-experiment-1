import {
  SUBSURFACE_EXCAVATION_COST,
  SUBSURFACE_EXCAVATION_MATERIALS,
  SUBSURFACE_ROOM_PRICES,
  DEEP_MINERAL_SILO_PRICE,
} from './economy'

export type SubsurfaceRoomId = 'mineral-vault' | 'deep-mineral-vault' | 'parts-locker' | 'habitat-training'

export interface SubsurfaceRoomDefinition {
  id: SubsurfaceRoomId
  eyebrow: string
  name: string
  description: string
  cost: number
  costMaterials: Record<string, number>
}

/** Excavation clears the below-soil area so rooms can be built into it — it is
 *  a prerequisite for every room, not a room itself. */
export const SUBSURFACE_EXCAVATE_COST = {
  cost: SUBSURFACE_EXCAVATION_COST,
  costMaterials: SUBSURFACE_EXCAVATION_MATERIALS as Record<string, number>,
}

/**
 * The subsurface is an embedded Earth Base destination rather than a routed
 * screen. These definitions keep its three room scenes named consistently in
 * the scene catalog, UI, tests, and eventual Forge/Pixi migration.
 *
 * Rooms are unbuilt by default (STS-633): the player must excavate the deck,
 * then build each room individually before it holds live inventory. This
 * mirrors the surface Build·Place cost shape (francs + mineral materials)
 * rather than inventing a new construction mechanic.
 */
export const SUBSURFACE_ROOMS: readonly SubsurfaceRoomDefinition[] = [
  {
    id: 'mineral-vault',
    eyebrow: 'STORAGE · BAY 01',
    name: 'Mineral Vault',
    description: 'Recovered ore is catalogued by species and held for refining, construction, or sale.',
    cost: SUBSURFACE_ROOM_PRICES['mineral-vault'],
    costMaterials: { aluminium: 15, copper: 8 },
  },
  {
    id: 'deep-mineral-vault',
    eyebrow: 'STORAGE · BAY 04',
    name: 'Deep Mineral Vault',
    description: 'Expanded underground storage for timing sales, refinery queues, and remote-site logistics.',
    cost: DEEP_MINERAL_SILO_PRICE,
    costMaterials: { aluminium: 30, copper: 16, silicon: 8 },
  },
  {
    id: 'parts-locker',
    eyebrow: 'STORAGE · BAY 02',
    name: 'Parts Stores',
    description: 'Rocket hardware is registered by room type and kept ready for Hangar operations.',
    cost: SUBSURFACE_ROOM_PRICES['parts-locker'],
    costMaterials: { aluminium: 15, silicon: 6 },
  },
  {
    id: 'habitat-training',
    eyebrow: 'HABITAT · BAY 03',
    name: 'Habitat Training',
    description: 'Below-soil mission rehearsals for astronaut crews in enclosed surface habitats.',
    cost: SUBSURFACE_ROOM_PRICES['habitat-training'],
    costMaterials: { aluminium: 20, copper: 10, silicon: 10 },
  },
] as const

export function canAffordSubsurface(
  cost: { cost: number; costMaterials: Record<string, number> },
  opts: { francs: number; stash?: Record<string, number> },
): boolean {
  if (opts.francs < cost.cost) return false
  return Object.entries(cost.costMaterials).every(
    ([mineral, amount]) => (opts.stash?.[mineral] ?? 0) >= amount,
  )
}
