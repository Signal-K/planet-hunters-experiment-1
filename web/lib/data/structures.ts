// Landnam game data — structures

import type { StructureBlueprint } from './types'
import { STRUCTURE_PRICES, SURFACE_SILO_PRICE } from './economy'

export const STRUCTURES: StructureBlueprint[] = [
  { id: 'launchpad', name: 'Launchpad', kind: 'launchpad', cost: 0, unlocksAt: 'always', unlockTrigger: 'always', description: 'Rocket assembly and launch operations.' },
  {
    id: 'surface-silo',
    name: 'Surface Silo',
    kind: 'surface-silo',
    cost: SURFACE_SILO_PRICE,
    // SSL-332: building it is the last guided step, and it is what opens Free Ops.
    unlocksAt: 'Fly both guided missions first',
    unlockTrigger: 'onboarding-missions',
    description: 'Small Earth-side mineral storage. Keep ore for construction; overflow is sold when a flight returns.',
  },
  {
    id: 'market',
    name: 'Exchange',
    kind: 'market',
    cost: STRUCTURE_PRICES.exchange,
    // Optional: players choose to build it once they are trading on their own.
    unlocksAt: 'Opens once the guided missions are flown',
    unlockTrigger: 'onboarding-missions',
    description: 'Cargo dock where you sell ore at the spot price.',
  },
  {
    id: 'control-station',
    name: 'Agency Hub',
    kind: 'control-station',
    cost: STRUCTURE_PRICES.controlStation,
    // Satellites and telescopes are run from here, so it comes before the first launch of either.
    unlocksAt: 'Opens once the guided missions are flown',
    unlockTrigger: 'onboarding-missions',
    description: 'Your agency headquarters. Holds the mission log and runs your satellites and telescopes. Build it before you launch one.',
  },
]

/** Silo and Exchange appear once one run has been flown: before that there is no ore to store or sell, and they cost
 *  a fifth of the starting francs. (Free Ops itself opens with the launchpad.) */
const FIRST_STORAGE_MISSIONS_DONE = 1
