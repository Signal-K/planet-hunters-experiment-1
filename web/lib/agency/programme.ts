import { fleetCount } from './fleet'
import { groundTelescopeLevel } from '@/lib/ground-telescope-upgrades'
import { probeSectorGoal, sectorsMapped } from '@/lib/probes/survey-probe'
// The agency programme (SSL-852): one list of what the agency has launched or built, the citizen science project
// each craft carries, how much data it brings a day and what the player has contributed to that project.
//
// Before this the same craft were described separately by the Data hub registry (control-station.ts), the Data hub
// sky (control-station-sky.ts), pointing (research/paths.ts), the Base sky, the Program tab and the launch missions.
// New surfaces read this model, derived from legacy ownership plus idempotent launch receipts. Pure over the player.

import type { Mission } from '@/lib/data/types'
import type { Player } from '@/lib/game-types'
import { SATURN_IMAGER_DAILY_COUNT } from '@/lib/data/saturn-candidates'
import {
  GROUND_TELESCOPE_EXTRA_ASTEROID_CANDIDATES, GROUND_TELESCOPE_IDS, deepSpaceInstrumentLevel, nextGroundTelescopeId,
  groundTelescopeObserving, ownedGroundTelescopes, transitInstrumentLevel,
} from '@/lib/systems/InstrumentFeedSystem'
import { sectorMsOf } from '@/lib/probes/survey-probe'
import { fleetDataCount, fleetCondition, type CraftCondition } from '@/lib/agency/condition'

export type AgencyProjectId = 'exoplanet-hunters' | 'asteroid-discovery' | 'saturn-storms' | 'deposit-survey'

export interface AgencyProject {
  id: AgencyProjectId
  name: string
  /** What the player does with the data, in a few words. */
  work: string
  /** Where the real data comes from. */
  source: string
}

export const AGENCY_PROJECTS: Record<AgencyProjectId, AgencyProject> = {
  'exoplanet-hunters': { id: 'exoplanet-hunters', name: 'Exoplanet Hunters', work: 'Find planets crossing their stars', source: 'TESS light curves' },
  'asteroid-discovery': { id: 'asteroid-discovery', name: 'Asteroid discovery', work: 'Confirm new moving objects', source: 'Minor Planet Center candidates' },
  'saturn-storms': { id: 'saturn-storms', name: 'Saturn storms', work: 'Spot storm clouds on Saturn', source: 'Cassini frames' },
  'deposit-survey': { id: 'deposit-survey', name: 'Deposit survey', work: 'Map what a body holds', source: 'Your probes' },
}

export type AgencyCraftId = 'ground-telescope' | 'space-telescope' | 'saturn-satellite' | 'survey-probe'

export interface AgencyCraft {
  id: AgencyCraftId
  name: string
  /** `launch` flies from the launchpad; `build` is bought in the Data hub and placed on the Base. */
  how: 'launch' | 'build'
  projects: AgencyProject[]
  /** How many the agency has (ground telescopes and probes can be more than one). */
  owned: number
  /** Items of data a day across the craft's projects, 0 while it has none working. */
  dataPerDay: number
  /** Everything the player has contributed to this craft's projects. */
  contributed: number
  /** True when the agency can add one now. */
  canAdd: boolean
  /** What one more adds, for the launch prompt. */
  adds: string
  /** SSL-852: wear on an orbiting craft the agency has, null for craft that do not wear or are not up. */
  condition: CraftCondition | null
}

export type ProgrammePlayer = Pick<Player,
  | 'freeOperations' | 'placed' | 'transitSatelliteLaunchedAt' | 'transitSatelliteLevel' | 'deepSpaceTelescopeBuilt'
  | 'deepSpaceTelescopeLevel' | 'saturnImagerLaunchedAt' | 'probes' | 'tessClassifications' | 'asteroidClassifications'
  | 'saturnClassifications'
> & Partial<Pick<Player, 'placementPlots' | 'groundTelescopeGrandfathered' | 'satelliteTargetId' | 'instrumentDigestNotifiedOn' | 'craftServicedAt' | 'spaceStorms' | 'groundTelescopeLevels' | 'agencyLaunches' | 'agencyDonations'>>

const DAY_MS = 86_400_000
const count = (records: Record<string, unknown> | undefined) => Object.keys(records ?? {}).filter(id => !id.startsWith('training-')).length

/** Contributions the player has made to each project, from the records the classify screens already keep. */
export function projectContributions(player: ProgrammePlayer): Record<AgencyProjectId, number> {
  return {
    'exoplanet-hunters': count(player.tessClassifications),
    'asteroid-discovery': count(player.asteroidClassifications),
    'saturn-storms': count(player.saturnClassifications),
    'deposit-survey': Object.values(player.probes ?? {}).reduce((sum, probe) => sum + count(probe.readings), 0),
  }
}

/** Every craft the agency can have, owned or not, in the order a player meets them. */
export function agencyProgramme(player: ProgrammePlayer, now: number = Date.now()): AgencyCraft[] {
  const spaceCondition = fleetCondition(player, 'space-telescope', now)
  const saturnCondition = fleetCondition(player, 'saturn-satellite', now)
  const done = projectContributions(player)
  const P = AGENCY_PROJECTS
  const ground = ownedGroundTelescopes(player).length
  const spaceUp = !!player.transitSatelliteLaunchedAt
  const saturnUp = !!player.saturnImagerLaunchedAt
  const probes = Object.values(player.probes ?? {})
  const asteroidsFromOrbit = spaceUp && player.deepSpaceTelescopeBuilt !== false ? deepSpaceInstrumentLevel(player as Parameters<typeof deepSpaceInstrumentLevel>[0]) : 0
  return [
    {
      id: 'ground-telescope', name: 'Ground telescope', how: 'build', projects: [P['asteroid-discovery']],
      owned: ground,
      dataPerDay: GROUND_TELESCOPE_IDS.reduce((n, id) => n + (groundTelescopeObserving(player, id) ? groundTelescopeLevel(player, id) : 0), 0),
      contributed: done['asteroid-discovery'],
      canAdd: nextGroundTelescopeId(player) !== null && ground < GROUND_TELESCOPE_IDS.length,
      adds: `+${GROUND_TELESCOPE_EXTRA_ASTEROID_CANDIDATES} asteroid candidate a day`,
      condition: null,
    },
    {
      id: 'space-telescope', name: 'Space telescope', how: 'launch', projects: [P['exoplanet-hunters'], P['asteroid-discovery']],
      owned: fleetCount(player, 'space-telescope'),
      dataPerDay: spaceUp ? fleetDataCount(player, 'space-telescope', transitInstrumentLevel(player as Parameters<typeof transitInstrumentLevel>[0]), now) + fleetDataCount(player, 'space-telescope', asteroidsFromOrbit, now) : 0,
      contributed: done['exoplanet-hunters'] + done['asteroid-discovery'],
      canAdd: true,
      adds: `+${transitInstrumentLevel(player as Parameters<typeof transitInstrumentLevel>[0])} light curve and +${deepSpaceInstrumentLevel(player as Parameters<typeof deepSpaceInstrumentLevel>[0])} asteroid candidate a day`,
      condition: spaceCondition,
    },
    {
      id: 'saturn-satellite', name: 'Saturn satellite', how: 'launch', projects: [P['saturn-storms']],
      owned: fleetCount(player, 'saturn-satellite'),
      dataPerDay: saturnUp ? fleetDataCount(player, 'saturn-satellite', SATURN_IMAGER_DAILY_COUNT, now) : 0,
      contributed: done['saturn-storms'],
      canAdd: true,
      adds: `+${SATURN_IMAGER_DAILY_COUNT} Cassini frame${SATURN_IMAGER_DAILY_COUNT === 1 ? '' : 's'} a day`,
      condition: saturnCondition,
    },
    {
      id: 'survey-probe', name: 'Survey probe', how: 'launch', projects: [P['deposit-survey']],
      owned: probes.length,
      dataPerDay: probes.reduce((sum, probe) => sum + Math.min(probeSectorGoal(probe) - sectorsMapped(probe, now).length, Math.round(DAY_MS / sectorMsOf(probe))), 0),
      contributed: done['deposit-survey'],
      // A probe goes to a body without one; the Program tab offers the nearest two.
      canAdd: true,
      adds: 'Maps a body, one sector at a time',
      condition: null,
    },
  ]
}

export interface AgencySummary {
  /** Craft the agency has, by name, with how many. */
  owned: AgencyCraft[]
  /** The next thing to launch or build: the first craft the agency has none of, else the first it can add. */
  next: AgencyCraft | null
  dataPerDay: number
  contributed: number
  /** True when at least one owned craft sends data the player classifies (a probe maps on its own). */
  hasClassifyData: boolean
  /** SSL-852: the worst-worn craft that needs a servicing mission, if any. */
  needsService: AgencyCraft | null
}

export function agencySummary(player: ProgrammePlayer, now: number = Date.now()): AgencySummary {
  const craft = agencyProgramme(player, now)
  const owned = craft.filter(item => item.owned > 0)
  const done = projectContributions(player)
  return {
    owned,
    next: craft.find(item => item.owned === 0 && item.canAdd) ?? craft.find(item => item.canAdd) ?? null,
    dataPerDay: owned.reduce((sum, item) => sum + item.dataPerDay, 0),
    contributed: Object.values(done).reduce((sum, n) => sum + n, 0),
    hasClassifyData: owned.some(item => item.id !== 'survey-probe' && item.dataPerDay > 0),
    needsService: owned.filter(item => item.condition?.needsService).sort((a, b) => (a.condition?.percent ?? 100) - (b.condition?.percent ?? 100))[0] ?? null,
  }
}

/** A mission that puts an agency craft up: launching it is agency research (the `launch` stamp). */
export function isAgencyLaunch(mission: Pick<Mission, 'payload'> | null | undefined): boolean {
  return mission?.payload?.type === 'satellite'
}
