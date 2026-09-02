import type { Catalog } from './catalog'
import type { Mission, Target } from './data'
import type { Player } from './game-types'
import { diplomacyPayoutMultiplier, jointMissionUnlocked } from './systems/AcademySystem'
import { deepSpaceTelescopeUnlocked } from './data/structures'
import { FEATURE_FLAGS } from './featureFlags'

export const TRANSIT_TELESCOPE_TARGET_ID = 'earth-orbit-transit-telescope'
export const TRANSIT_TELESCOPE_MISSION_ID = 'story-transit-telescope-launch'

export const TRANSIT_TELESCOPE_TARGET: Target = {
  id: TRANSIT_TELESCOPE_TARGET_ID,
  name: 'Earth Orbit',
  type: 'planet',
  orbit: 1,
  difficulty: 'L1',
  brief: 'Low Earth orbit deployment lane for a transit telescope monitored from Base operations.',
  minerals: [],
}

// KES-128: the Deep Space Telescope's on-ramp, matching the Transit
// Telescope's story-mission pattern above rather than the bare numeric
// deepSpaceTelescopeUnlocked() threshold (STS-622) silently opening a build
// slot with no narrative reason it happened.
export const DEEP_SPACE_TELESCOPE_TARGET_ID = 'earth-orbit-deep-space-telescope'
export const DEEP_SPACE_TELESCOPE_MISSION_ID = 'story-deep-space-telescope-survey'

export const DEEP_SPACE_TELESCOPE_TARGET: Target = {
  id: DEEP_SPACE_TELESCOPE_TARGET_ID,
  name: 'Earth Orbit',
  type: 'planet',
  orbit: 1,
  difficulty: 'L1',
  brief: 'High-orbit survey lane for calibrating a long-baseline instrument against the Minor Planet Center feed.',
  minerals: [],
}

// KES-132: the Scan Station previously unlocked its build slot off a bare
// feature flag (FEATURE_FLAGS.scanStation) plus reaching Free Operations,
// with no narrative on-ramp — unlike the Transit/Deep Space Telescope
// story-mission pattern above. This mission is the on-ramp; the flag now
// only decides when it's offered, and completing it opens the build slot.
export const SCAN_STATION_TARGET_ID = 'earth-orbit-scan-station-commission'
export const SCAN_STATION_MISSION_ID = 'story-scan-station-commission'

export const SCAN_STATION_TARGET: Target = {
  id: SCAN_STATION_TARGET_ID,
  name: 'Earth Orbit',
  type: 'planet',
  orbit: 1,
  difficulty: 'L1',
  brief: 'Low Earth orbit shakedown lane for commissioning the Scan Station before it comes online at Base.',
  minerals: [],
}

interface RuntimeCatalogOpts {
  catalog: Catalog
  discoveredTargets?: Record<string, Target>
  freeOperations: boolean
  transitSatelliteLaunchedAt?: number | null
  missionId?: string | null
  targetId?: string | null
  missionsDone: number
  player?: Player
}

export function buildRuntimeCatalog({
  catalog,
  discoveredTargets = {},
  freeOperations,
  transitSatelliteLaunchedAt,
  missionId,
  targetId,
  missionsDone,
  player,
}: RuntimeCatalogOpts): Catalog {
  const discoveredTargetList = Object.values(discoveredTargets)
  const shouldOfferTransitTelescopeMission = freeOperations && !transitSatelliteLaunchedAt
  const hasActiveTransitTelescopeMission = missionId === TRANSIT_TELESCOPE_MISSION_ID || targetId === TRANSIT_TELESCOPE_TARGET_ID
  const shouldIncludeTransitTelescopeMission = shouldOfferTransitTelescopeMission || hasActiveTransitTelescopeMission
  const shouldOfferDeepSpaceTelescopeMission = freeOperations
    && !player?.deepSpaceTelescopeMissionCompletedAt
    && !player?.placed?.includes('deep-space-telescope')
    && deepSpaceTelescopeUnlocked({ transitSatelliteLevel: player?.transitSatelliteLevel, clientMissions: player?.clientMissions })
  const hasActiveDeepSpaceTelescopeMission = missionId === DEEP_SPACE_TELESCOPE_MISSION_ID || targetId === DEEP_SPACE_TELESCOPE_TARGET_ID
  const shouldIncludeDeepSpaceTelescopeMission = shouldOfferDeepSpaceTelescopeMission || hasActiveDeepSpaceTelescopeMission
  const shouldOfferScanStationMission = FEATURE_FLAGS.scanStation
    && freeOperations
    && !player?.scanStationMissionCompletedAt
    && !player?.placed?.includes('scan-station')
  const hasActiveScanStationMission = missionId === SCAN_STATION_MISSION_ID || targetId === SCAN_STATION_TARGET_ID
  const shouldIncludeScanStationMission = shouldOfferScanStationMission || hasActiveScanStationMission
  const existingTargetIds = new Set(catalog.targets.map(target => target.id))
  const mergedTargets = [
    ...catalog.targets,
    ...(shouldIncludeTransitTelescopeMission && !existingTargetIds.has(TRANSIT_TELESCOPE_TARGET.id) ? [TRANSIT_TELESCOPE_TARGET] : []),
    ...(shouldIncludeDeepSpaceTelescopeMission && !existingTargetIds.has(DEEP_SPACE_TELESCOPE_TARGET.id) ? [DEEP_SPACE_TELESCOPE_TARGET] : []),
    ...(shouldIncludeScanStationMission && !existingTargetIds.has(SCAN_STATION_TARGET.id) ? [SCAN_STATION_TARGET] : []),
    ...discoveredTargetList.filter(target => !existingTargetIds.has(target.id)),
  ]
  const relationshipMissions = player
    ? catalog.missions.map(mission => {
        if (!mission.client || mission.programReward) return mission
        const multiplier = diplomacyPayoutMultiplier(player, mission.client)
        if (multiplier === 1) return mission
        return {
          ...mission,
          payout: {
            ...mission.payout,
            francs: Math.round(mission.payout.francs * multiplier),
          },
        }
      })
    : catalog.missions
  const existingMissionIds = new Set(relationshipMissions.map(mission => mission.id))
  const transitTelescopeMission: Mission[] = shouldIncludeTransitTelescopeMission && !existingMissionIds.has(TRANSIT_TELESCOPE_MISSION_ID)
    ? [{
        id: TRANSIT_TELESCOPE_MISSION_ID,
        title: 'Launch Transit Telescope',
        brief: 'Deploy your own TESS-class telescope into Earth orbit. Its daily instrument feed becomes available for classification.',
        tag: 'STORY',
        difficulty: 'L1',
        locked: false,
        sequence: missionsDone + 1,
        unlockAt: 'Reach Free Operations',
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
  const deepSpaceTelescopeMission: Mission[] = shouldIncludeDeepSpaceTelescopeMission && !existingMissionIds.has(DEEP_SPACE_TELESCOPE_MISSION_ID)
    ? [{
        id: DEEP_SPACE_TELESCOPE_MISSION_ID,
        title: 'Survey the Deep Space Telescope Site',
        brief: 'Your transit telescope and client standing have earned you a second instrument. Fly a calibration survey to establish the Deep Space Telescope before you build it.',
        tag: 'STORY',
        difficulty: 'L1',
        locked: false,
        sequence: missionsDone + 1,
        unlockAt: 'Transit telescope level 2 and affinity level 2 with a client',
        targetId: DEEP_SPACE_TELESCOPE_TARGET_ID,
        payload: {
          type: 'deep-space-survey',
          name: 'Deep Space Telescope Array',
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
          outcome: 'Deep Space Telescope site surveyed · ready to build',
        },
        payout: { francs: 0, affinity: 0 },
      }]
    : []
  const scanStationMission: Mission[] = shouldIncludeScanStationMission && !existingMissionIds.has(SCAN_STATION_MISSION_ID)
    ? [{
        id: SCAN_STATION_MISSION_ID,
        title: 'Commission the Scan Station',
        brief: 'Fly a shakedown pass in Earth orbit to calibrate the Scan Station before it comes online at Base — the same commissioning pass every remote instrument gets before its build slot opens.',
        tag: 'STORY',
        difficulty: 'L1',
        locked: false,
        sequence: missionsDone + 1,
        unlockAt: 'Reach Free Operations',
        targetId: SCAN_STATION_TARGET_ID,
        payload: {
          type: 'scan-station-commission',
          name: 'Scan Station Shakedown',
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
          outcome: 'Scan Station commissioned · remote scanning online',
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

  const jointMissions: Mission[] = player
    ? Object.keys(catalog.clients).flatMap(clientId => {
        if (!jointMissionUnlocked(player, clientId)) return []
        const base = relationshipMissions.find(mission =>
          mission.client === clientId
          && !!mission.targetId
          && !mission.programReward
          && !mission.jointProject,
        )
        if (!base) return []
        const basePayout = base.payout.francs
        const payoutBonus = Math.round(basePayout * 0.2)
        return [{
          ...base,
          id: `joint-${clientId}-${base.id}`,
          title: `Joint Venture · ${base.title}`,
          brief: `${catalog.clients[clientId].name} will co-fund this flight and contribute local infrastructure. Your Academy diplomacy desk negotiated shared risk, a range allowance, and a completion premium.`,
          tag: 'JOINT',
          jointProject: {
            playerCost: Math.round(basePayout * 0.08),
            clientCostShare: Math.round(basePayout * 0.08),
            payoutBonus,
            infrastructureOrbitBonus: 1,
          },
          payout: { ...base.payout, francs: basePayout + payoutBonus },
        }]
      })
    : []

  return {
    ...catalog,
    targets: mergedTargets,
    missions: [...relationshipMissions, ...transitTelescopeMission, ...deepSpaceTelescopeMission, ...scanStationMission, ...surveyMissions, ...jointMissions],
  }
}
