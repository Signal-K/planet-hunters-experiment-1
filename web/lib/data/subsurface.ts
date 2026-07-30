export type SubsurfaceRoomId = 'mineral-vault' | 'parts-locker' | 'habitat-training'

export interface SubsurfaceRoomDefinition {
  id: SubsurfaceRoomId
  eyebrow: string
  name: string
  description: string
}

/**
 * The subsurface is an embedded Earth Base destination rather than a routed
 * screen. These definitions keep its three room scenes named consistently in
 * the scene catalog, UI, tests, and eventual Forge/Pixi migration.
 */
export const SUBSURFACE_ROOMS: readonly SubsurfaceRoomDefinition[] = [
  {
    id: 'mineral-vault',
    eyebrow: 'STORAGE · BAY 01',
    name: 'Mineral Vault',
    description: 'Recovered ore is catalogued by species and held for refining, construction, or sale.',
  },
  {
    id: 'parts-locker',
    eyebrow: 'STORAGE · BAY 02',
    name: 'Parts Stores',
    description: 'Rocket hardware is registered by room type and kept ready for Hangar operations.',
  },
  {
    id: 'habitat-training',
    eyebrow: 'HABITAT · BAY 03',
    name: 'Habitat Training',
    description: 'Below-soil mission rehearsals for astronaut crews in enclosed surface habitats.',
  },
] as const
