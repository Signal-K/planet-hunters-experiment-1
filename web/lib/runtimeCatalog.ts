import type { Catalog } from './catalog'
import type { Client, Mission, Target } from './data'
import { missionPayoutFloor } from './data'

export const STORY_MISSION_CLIENT_ID = 'mission-control'
export const TRANSIT_TELESCOPE_TARGET_ID = 'earth-orbit-transit-telescope'
export const TRANSIT_TELESCOPE_MISSION_ID = 'story-transit-telescope-launch'

export const MISSION_CONTROL_CLIENT: Client = {
  id: STORY_MISSION_CLIENT_ID,
  name: 'Mission Control',
  color: '#7ec8ff',
  initial: 'MC',
  unlockTier: 0,
  projectType: 'Story mission',
  mineralPreferences: [],
  payoutPremium: 0,
  affinityBonusPerMission: 0,
  uiRole: 'command',
}

export const TRANSIT_TELESCOPE_TARGET: Target = {
  id: TRANSIT_TELESCOPE_TARGET_ID,
  name: 'Earth Orbit',
  type: 'planet',
  orbit: 1,
  difficulty: 'L1',
  brief: 'Low Earth orbit deployment lane for a transit telescope monitored from the Earth-base SMS.',
  minerals: [],
}

interface RuntimeCatalogOpts {
  catalog: Catalog
  discoveredTargets?: Record<string, Target>
  freeOperations: boolean
  satelliteMonitoringBuilt?: boolean
  transitSatelliteLaunchedAt?: number | null
  missionId?: string | null
  targetId?: string | null
  missionsDone: number
}

export function buildRuntimeCatalog({
  catalog,
  discoveredTargets = {},
  freeOperations,
  satelliteMonitoringBuilt,
  transitSatelliteLaunchedAt,
  missionId,
  targetId,
  missionsDone,
}: RuntimeCatalogOpts): Catalog {
  const discoveredTargetList = Object.values(discoveredTargets)
  const shouldOfferTransitTelescopeMission = freeOperations && !!satelliteMonitoringBuilt && !transitSatelliteLaunchedAt
  const hasActiveTransitTelescopeMission = missionId === TRANSIT_TELESCOPE_MISSION_ID || targetId === TRANSIT_TELESCOPE_TARGET_ID
  const shouldIncludeTransitTelescopeMission = shouldOfferTransitTelescopeMission || hasActiveTransitTelescopeMission
  if (discoveredTargetList.length === 0 && !shouldIncludeTransitTelescopeMission) return catalog

  const existingTargetIds = new Set(catalog.targets.map(target => target.id))
  const mergedTargets = [
    ...catalog.targets,
    ...(shouldIncludeTransitTelescopeMission && !existingTargetIds.has(TRANSIT_TELESCOPE_TARGET.id) ? [TRANSIT_TELESCOPE_TARGET] : []),
    ...discoveredTargetList.filter(target => !existingTargetIds.has(target.id)),
  ]
  const existingMissionIds = new Set(catalog.missions.map(mission => mission.id))
  const transitTelescopeMission: Mission[] = shouldIncludeTransitTelescopeMission && !existingMissionIds.has(TRANSIT_TELESCOPE_MISSION_ID)
    ? [{
        id: TRANSIT_TELESCOPE_MISSION_ID,
        title: 'Launch Transit Telescope',
        brief: 'Mission Control authorizes a story operation to place a TESS-class telescope in Earth orbit. This is not a client request.',
        client: STORY_MISSION_CLIENT_ID,
        tag: 'STORY',
        difficulty: 'L1',
        locked: false,
        sequence: missionsDone + 1,
        unlockAt: 'Build Satellite Monitoring Station',
        targetId: TRANSIT_TELESCOPE_TARGET_ID,
        payload: {
          type: 'satellite',
          name: 'Transit Telescope',
          cargoCost: 0,
        },
        requires: {
          minerals: {},
          cargo_min: 0,
          drill_tier: 1,
          max_orbit: 1,
        },
        payout: {
          // Free Ops missions are ordinary contracts and must sit on the same
          // scale as every other one. These two used to pay 150k and 500k
          // against a 1.5B+ floor everywhere else — four orders of magnitude
          // out, and not enough to cover the rocket the mission needs.
          francs: missionPayoutFloor(missionsDone + 1),
          affinity: 0,
        },
      }]
    : []
  const surveyMissions: Mission[] = discoveredTargetList
    .map((target, index) => ({
      id: `exo-survey-${target.id}`,
      title: `${target.name} survey flight`,
      brief: `Follow up the satellite discovery with a crewed survey mission to ${target.name}. This target is plotted in the star map.`,
      client: 'lumen-research',
      tag: 'SCIENCE',
      difficulty: target.difficulty,
      locked: false,
      sequence: missionsDone + 1,
      unlockAt: 'Classify a satellite candidate',
      targetId: target.id,
      requires: {
        minerals: {},
        cargo_min: 0,
        drill_tier: 1,
        max_orbit: target.orbit,
      },
      payout: {
        francs: missionPayoutFloor(missionsDone + 1) + index * 100_000_000,
        affinity: 6,
      },
    }))
    .filter(mission => !existingMissionIds.has(mission.id))

  return {
    ...catalog,
    clients: {
      ...catalog.clients,
      ...(shouldIncludeTransitTelescopeMission ? { [STORY_MISSION_CLIENT_ID]: MISSION_CONTROL_CLIENT } : {}),
    },
    targets: mergedTargets,
    missions: [...catalog.missions, ...transitTelescopeMission, ...surveyMissions],
  }
}
