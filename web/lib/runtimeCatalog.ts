import type { Catalog } from './catalog'
import type { Mission, Target } from './data'

export const TRANSIT_TELESCOPE_TARGET_ID = 'earth-orbit-transit-telescope'
export const TRANSIT_TELESCOPE_MISSION_ID = 'story-transit-telescope-launch'

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
        brief: 'Deploy your own TESS-class telescope into Earth orbit. Its daily instrument feed will downlink to the Satellite Monitoring Station.',
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
        programReward: {
          researchXP: 0,
          outcome: 'Transit telescope online · daily instrument feed unlocked',
        },
        payout: { francs: 0, affinity: 0 },
      }]
    : []
  const surveyMissions: Mission[] = discoveredTargetList
    .map(target => ({
      id: `exo-survey-${target.id}`,
      title: `${target.name} survey flight`,
      brief: `Follow up your satellite discovery with an owned survey flight to ${target.name}. The readings expand your target intelligence.`,
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
      programReward: {
        researchXP: 25,
        outcome: `${target.name} target intelligence expanded`,
      },
      payout: { francs: 0, affinity: 0 },
    }))
    .filter(mission => !existingMissionIds.has(mission.id))

  return {
    ...catalog,
    targets: mergedTargets,
    missions: [...catalog.missions, ...transitTelescopeMission, ...surveyMissions],
  }
}
