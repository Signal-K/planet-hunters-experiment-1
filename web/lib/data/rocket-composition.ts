/**
 * Canonical vehicle composition used by operational renders, blueprints,
 * launch sequences, the Hangar, and end-of-mission recovery.  A model can be
 * prebuilt during onboarding without pretending that it is an indivisible
 * object: it still has physical stages, boosters, payload, and rooms.
 */
export type RocketRoomRole = 'cockpit' | 'storage' | 'engine'

export interface RocketRoomComposition {
  id: string
  label: string
  role: RocketRoomRole
}

export interface RocketStageComposition {
  id: string
  label: string
  propulsion: string
  rooms: RocketRoomComposition[]
  recovery: 'dismantle'
}

export interface RocketComponentRecipe {
  id: string
  label: string
  purchased: boolean
  ingredients: readonly string[]
}

export interface RocketComposition {
  rocketId: string
  stages: readonly RocketStageComposition[]
  boosters: { label: string; count: number; recovery: 'dismantle' }
  payload: { label: string; kind: 'mining-laser'; fairing: boolean }
  recipes: readonly RocketComponentRecipe[]
}

const explorer: RocketComposition = {
  rocketId: 'explorer',
  stages: [{
    id: 'explorer-operating-stage',
    label: 'Explorer operating stage',
    propulsion: 'Ion drive I',
    rooms: [
      { id: 'explorer-cockpit', label: 'Cockpit', role: 'cockpit' },
      { id: 'explorer-storage', label: 'Mineral storage bay', role: 'storage' },
      { id: 'explorer-engine', label: 'Engine room', role: 'engine' },
    ],
    recovery: 'dismantle',
  }],
  boosters: { label: 'Solid booster set I', count: 2, recovery: 'dismantle' },
  payload: { label: 'Mining laser I', kind: 'mining-laser', fairing: true },
  recipes: [
    { id: 'hull-alloy', label: 'Hull alloy', purchased: false, ingredients: ['iron', 'silicon'] },
    { id: 'ion-drive-i', label: 'Ion drive I', purchased: false, ingredients: ['iron', 'silicon'] },
    { id: 'solid-boosters-i', label: 'Solid booster set I', purchased: false, ingredients: ['iron', 'carbon'] },
    { id: 'mining-laser-i', label: 'Mining laser I', purchased: false, ingredients: ['silicon', 'iron'] },
  ],
}

const prospector: RocketComposition = {
  rocketId: 'prospector',
  stages: [{
    id: 'prospector-operating-stage',
    label: 'Prospector operating stage',
    propulsion: 'Fusion drive II',
    rooms: [
      { id: 'prospector-cockpit', label: 'Cockpit', role: 'cockpit' },
      { id: 'prospector-storage', label: 'Expanded mineral storage', role: 'storage' },
      { id: 'prospector-engine', label: 'Engine room II', role: 'engine' },
    ],
    recovery: 'dismantle',
  }],
  boosters: { label: 'Solid booster set II', count: 2, recovery: 'dismantle' },
  payload: { label: 'Mining laser II', kind: 'mining-laser', fairing: true },
  recipes: [
    { id: 'hull-alloy-ii', label: 'Reinforced hull alloy', purchased: false, ingredients: ['iron', 'silicon', 'carbon'] },
    { id: 'fusion-drive-ii', label: 'Fusion drive II', purchased: false, ingredients: ['iron', 'silicon', 'rare'] },
    { id: 'solid-boosters-ii', label: 'Solid booster set II', purchased: false, ingredients: ['iron', 'carbon', 'silicon'] },
    { id: 'mining-laser-ii', label: 'Mining laser II', purchased: false, ingredients: ['silicon', 'iron', 'rare'] },
  ],
}

export const ROCKET_COMPOSITIONS: Record<string, RocketComposition> = { explorer, prospector }

export function rocketCompositionForId(rocketId: string): RocketComposition {
  return ROCKET_COMPOSITIONS[rocketId] ?? explorer
}
