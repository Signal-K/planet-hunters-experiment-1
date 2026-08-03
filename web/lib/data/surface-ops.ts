export type SurfaceSiteAvailability = 'available' | 'equipment-locked'

export interface SurfaceSiteDefinition {
  id: string
  bodyId: 'moon' | 'mars' | 'europa'
  name: string
  region: string
  orbitBand: number
  demand: 'baseline' | 'elevated' | 'high'
  rightsCost: number
  availability: SurfaceSiteAvailability
  unlockHint: string
  description: string
}

/**
 * Rights prices sit on the current ₣15–25M contract scale. Proximity and
 * demand both affect the quote, but only the Moon is equipment-eligible in v0.
 */
export const SURFACE_SITES: readonly SurfaceSiteDefinition[] = [
  {
    id: 'moon-south-pole',
    bodyId: 'moon',
    name: 'Lunar South Pole',
    region: 'Shackleton Rim',
    orbitBand: 1,
    demand: 'baseline',
    rightsCost: 4_000_000,
    availability: 'available',
    unlockHint: 'Free Operations',
    description: 'Near-Earth logistics corridor with surveyed illumination and ice access.',
  },
  {
    id: 'mars-arcadia',
    bodyId: 'mars',
    name: 'Mars · Arcadia',
    region: 'Arcadia Planitia',
    orbitBand: 4,
    demand: 'elevated',
    rightsCost: 5_500_000,
    availability: 'equipment-locked',
    unlockHint: 'Interplanetary construction kit required',
    description: 'High-demand settlement terrain with shallow subsurface ice.',
  },
  {
    id: 'europa-chaos',
    bodyId: 'europa',
    name: 'Europa · Conamara',
    region: 'Conamara Chaos',
    orbitBand: 6,
    demand: 'high',
    rightsCost: 7_500_000,
    availability: 'equipment-locked',
    unlockHint: 'Outer-system construction kit required',
    description: 'Remote high-value terrain with severe radiation and logistics constraints.',
  },
] as const

export const SETTLEMENT_LAUNCHPAD = {
  id: 'settlement-launchpad',
  name: 'Settlement Launchpad',
  costFrancs: 6_000_000,
  costMaterials: {
    aluminium: 4,
    silicon: 6,
  },
  buildTimeMs: 20 * 60 * 1000,
  placementPads: 3,
} as const

export const SURFACE_STORAGE_CAPACITY = 20
export const SURFACE_FERRY_DURATION_MS = 10 * 60 * 1000

export function surfaceSiteById(id: string): SurfaceSiteDefinition | undefined {
  return SURFACE_SITES.find(site => site.id === id)
}
