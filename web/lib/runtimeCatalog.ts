import { downloadedSurvey, probeMission, probeOffers, probeTargetForMission } from '@/lib/probes/survey-probe'
import { probeContracts, probeRunMission } from '@/lib/probes/probe-offers'
import { MINERAL_META } from '@/lib/data/minerals'
import type { Catalog } from './catalog'
import { MISSIONS, RESOURCE_FOCUS_MISSION_ID, SELF_DIRECTED_MINING_MISSION_ID } from './data'
import type { Mission, Target } from './data'
import type { Player } from './game-types'
import { tagMissionCategories } from './data/mission-generator'
import { orionidsRunAvailable } from './orionids/access'
import { specialMissions } from './orionids/special-missions'
import { ORIONIDS_NIGHT_RUN_ID, ORIONIDS_SHOWER_TARGET_ID, orionidsNightRun, showerRunMission } from './data/missions'
import { SHOWERS, ORIONIDS_SHOWER_ID, showerForRunMission } from './data/showers'
import { DEBRIS_PRESETS, isDebrisEventActive } from './data/sky-events'

export const TRANSIT_TELESCOPE_TARGET_ID = 'earth-orbit-transit-telescope'
export const TRANSIT_TELESCOPE_MISSION_ID = 'story-transit-telescope-launch'

export const TRANSIT_TELESCOPE_TARGET: Target = {
  id: TRANSIT_TELESCOPE_TARGET_ID,
  name: 'Earth Orbit',
  type: 'planet',
  orbit: 1,
  difficulty: 'L1',
  brief: 'Low Earth orbit deployment lane for a space telescope monitored from Base operations.',
  minerals: [],
}

// KES-128: the Space Telescope's on-ramp, matching the Transit
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

// SSL-492: the Saturn satellite reuses the same launch -> flight -> debrief ->
// Instrument Hub path as the telescopes. No payout; real Cassini frames.
export const SATURN_IMAGER_TARGET_ID = 'earth-orbit-saturn-imager'
export const SATURN_IMAGER_MISSION_ID = 'story-saturn-imager-launch'

export const SATURN_IMAGER_TARGET: Target = {
  id: SATURN_IMAGER_TARGET_ID,
  name: 'Earth Orbit',
  type: 'planet',
  orbit: 1,
  difficulty: 'L1',
  brief: 'Orbital lane for a Saturn satellite that downlinks archived Cassini frames for storm-cloud review.',
  minerals: [],
}

export const ORIONIDS_SHOWER_TARGET: Target = showerTarget(ORIONIDS_SHOWER_ID)

/** The field a shower run flies to (SSL-658, SSL-774). */
export function showerTarget(showerId: string): Target {
  const shower = SHOWERS.find(item => item.id === showerId)!
  return {
    id: shower.targetId,
    name: `${shower.name} shower field`,
    type: 'event-field',
    orbit: 2,
    difficulty: 'L1',
    brief: showerId === ORIONIDS_SHOWER_ID
      ? "A moving meteor field arranged along Orion's pattern. These are anonymous shower points, not named asteroids."
      : `A moving meteor field for the ${shower.name}. These are anonymous shower points, not named asteroids.`,
    minerals: Object.keys(catalogMineralIds()),
  }
}

function catalogMineralIds(): Record<string, true> {
  return {
    iron: true, silicon: true, ice: true, carbon: true, nickel: true,
    cobalt: true, copper: true, aluminium: true, hydrogen: true, uranium: true,
    platinum: true, palladium: true, iridium: true, rhodium: true, gold: true, rare: true,
  }
}

interface RuntimeCatalogOpts {
  catalog: Catalog
  discoveredTargets?: Record<string, Target>
  freeOperations: boolean
  transitSatelliteLaunchedAt?: number | null
  missionId?: string | null
  targetId?: string | null
  missionsDone: number
  player?: Partial<Player>
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
  // A satellite or telescope is run from the control station, so none is offered until one is built.
  const hasControlStation = !!player?.placed?.includes('control-station')
  const shouldOfferTransitTelescopeMission = freeOperations && hasControlStation && !transitSatelliteLaunchedAt
  const hasActiveTransitTelescopeMission = missionId === TRANSIT_TELESCOPE_MISSION_ID || targetId === TRANSIT_TELESCOPE_TARGET_ID
  const shouldIncludeTransitTelescopeMission = shouldOfferTransitTelescopeMission || hasActiveTransitTelescopeMission
  const shouldOfferSaturnImagerMission = freeOperations && hasControlStation && !player?.saturnImagerLaunchedAt
  const hasActiveSaturnImagerMission = missionId === SATURN_IMAGER_MISSION_ID || targetId === SATURN_IMAGER_TARGET_ID
  const shouldIncludeSaturnImagerMission = shouldOfferSaturnImagerMission || hasActiveSaturnImagerMission
  const existingTargetIds = new Set(catalog.targets.map(target => target.id))
  const skyRead = player?.fireballSpotter?.passedAt != null
  // The event is over: outside its window only participants and archive buyers are offered the run.
  const orionidsOpen = orionidsRunAvailable(player as Parameters<typeof orionidsRunAvailable>[0], Date.now())
  const shouldOfferOrionidsMission = freeOperations && player?.orionidsEventStage === 0 && skyRead && orionidsOpen
  const shouldIncludeOrionidsTarget = missionId === ORIONIDS_NIGHT_RUN_ID || shouldOfferOrionidsMission || player?.orionidsEventStage === 0
  // A Leonid or Geminid run is offered only while that shower's window is open (or when it is the run in flight).
  const liveShowers = DEBRIS_PRESETS
    .filter(preset => preset.eventId !== ORIONIDS_SHOWER_ID && SHOWERS.some(shower => shower.id === preset.eventId))
    .filter(preset => freeOperations && skyRead && isDebrisEventActive(preset, Date.now()) || showerForRunMission(missionId)?.id === preset.eventId)
    .map(preset => preset.eventId)
  const mergedTargets = [
    ...catalog.targets,
    ...liveShowers.filter(id => !existingTargetIds.has(showerTarget(id).id)).map(showerTarget),
    ...(shouldIncludeOrionidsTarget && !existingTargetIds.has(ORIONIDS_SHOWER_TARGET.id) ? [ORIONIDS_SHOWER_TARGET] : []),
    ...(shouldIncludeTransitTelescopeMission && !existingTargetIds.has(TRANSIT_TELESCOPE_TARGET.id) ? [TRANSIT_TELESCOPE_TARGET] : []),
    ...(shouldIncludeSaturnImagerMission && !existingTargetIds.has(SATURN_IMAGER_TARGET.id) ? [SATURN_IMAGER_TARGET] : []),
    ...discoveredTargetList.filter(target => !existingTargetIds.has(target.id)),
  ]
  // A client contract pays its stated fee. The prior academy/diplomacy
  // multiplier was a second hidden client-progression system and conflicted
  // with the daily client-level economy.
  // The self-directed launchpad route must remain available even while a
  // remote catalog is warming or returns only its client rows. PocketBase
  // catalog responses are allowed to lag the authored frontend catalog; do
  // not let that transient gap render GO MINING disabled on the Program tab.
  const fallbackSelfDirectedMining: Mission = MISSIONS.find(mission => mission.id === SELF_DIRECTED_MINING_MISSION_ID)
    ?? MISSIONS.find(mission => mission.tag === 'FREE OPS' && !mission.client && !mission.payload && !mission.construction)
    ?? {
      id: SELF_DIRECTED_MINING_MISSION_ID,
      title: 'Self-Directed Mining Run',
      brief: 'No client, no daily limit. Pick any reachable target, mine what looks valuable, and sell the haul yourself at market price.',
      tag: 'FREE OPS',
      difficulty: 'L2',
      locked: false,
      sequence: missionsDone + 1,
      unlockAt: 'Reach Free Operations',
      requires: { minerals: { nickel: 1 }, cargo_min: 1, drill_tier: 1, max_orbit: 2 },
      payout: { francs: 0, affinity: 0 },
    }
  const hasSelfDirectedMining = catalog.missions.some(mission =>
    mission.tag === 'FREE OPS' && !mission.client && !mission.payload && !mission.construction,
  )
  let relationshipMissions = hasSelfDirectedMining || !fallbackSelfDirectedMining
    ? catalog.missions
    : [...catalog.missions, fallbackSelfDirectedMining]
  if (missionId === ORIONIDS_NIGHT_RUN_ID && !relationshipMissions.some(mission => mission.id === ORIONIDS_NIGHT_RUN_ID)) {
    relationshipMissions = [...relationshipMissions, orionidsNightRun()]
  }
  if (shouldOfferOrionidsMission && !relationshipMissions.some(mission => mission.id === ORIONIDS_NIGHT_RUN_ID)) {
    relationshipMissions = [...relationshipMissions, orionidsNightRun()]
  }
  for (const showerId of liveShowers) {
    const run = showerRunMission(showerId)
    if (!relationshipMissions.some(mission => mission.id === run.id)) relationshipMissions = [...relationshipMissions, run]
  }
  const existingMissionIds = new Set(relationshipMissions.map(mission => mission.id))
  const transitTelescopeMission: Mission[] = shouldIncludeTransitTelescopeMission && !existingMissionIds.has(TRANSIT_TELESCOPE_MISSION_ID)
    ? [{
        id: TRANSIT_TELESCOPE_MISSION_ID,
        title: 'Launch Space Telescope',
        brief: 'Deploy your own TESS-class telescope into Earth orbit. Its daily instrument feed becomes available for classification.',
        tag: 'STORY',
        difficulty: 'L1',
        locked: false,
        sequence: missionsDone + 1,
        unlockAt: 'Reach Free Operations',
        targetId: TRANSIT_TELESCOPE_TARGET_ID,
        payload: {
          type: 'satellite',
          name: 'Space Telescope',
          cargoCost: 0,
          instrumentId: 'transit-telescope',
        },
        requires: {
          minerals: {},
          cargo_min: 0,
          drill_tier: 1,
          max_orbit: 1,
        },
        programReward: {
          researchXP: 0,
          outcome: 'Space telescope online · daily instrument feed unlocked',
        },
        payout: { francs: 0, affinity: 0 },
      }]
    : []
  const saturnImagerMission: Mission[] = shouldIncludeSaturnImagerMission && !existingMissionIds.has(SATURN_IMAGER_MISSION_ID)
    ? [{
        id: SATURN_IMAGER_MISSION_ID,
        title: 'Launch Saturn satellite',
        brief: 'Deploy a Saturn satellite into Earth orbit. Its daily feed delivers real Cassini frames to check for storm clouds.',
        tag: 'STORY',
        difficulty: 'L1',
        locked: false,
        sequence: missionsDone + 1,
        unlockAt: 'Reach Free Operations',
        targetId: SATURN_IMAGER_TARGET_ID,
        payload: {
          type: 'satellite',
          name: 'Saturn satellite',
          cargoCost: 0,
          instrumentId: 'saturn-imager',
        },
        requires: {
          minerals: {},
          cargo_min: 0,
          drill_tier: 1,
          max_orbit: 1,
        },
        programReward: {
          researchXP: 0,
          outcome: 'Saturn satellite online · Cassini storm-cloud feed unlocked',
        },
        payout: { francs: 0, affinity: 0 },
      }]
    : []
  // SSL-773: survey probes, from the control station like the satellites. The nearest bodies without a probe are
  // offered; a probe already in flight keeps its mission so the run can finish.
  const probeFlightTarget = probeTargetForMission(missionId)
  const probeTargets = [
    ...(freeOperations && hasControlStation ? probeOffers(mergedTargets, player ?? {}) : []),
    ...(probeFlightTarget ? mergedTargets.filter(target => target.id === probeFlightTarget) : []),
  ]
  const probeMissions: Mission[] = [...new Map(probeTargets.map(target => [target.id, target])).values()]
    .map(target => probeMission(target, missionsDone + 1))
    .filter(mission => !existingMissionIds.has(mission.id))
  // What each probe's downloaded survey opens: a free targeted run to the body and client contracts for its deposits.
  // A contract already flown is not offered again; the one in flight stays so the run can finish.
  const flown = new Set((player?.completedMissions ?? []).map(record => record.id).filter(id => id !== missionId))
  const probeFollowUps: Mission[] = freeOperations
    ? Object.entries(player?.probes ?? {}).flatMap(([id, record]) => {
        const target = mergedTargets.find(item => item.id === id)
        if (!target) return []
        const survey = downloadedSurvey(target, record, mineral => MINERAL_META[mineral]?.rarity)
        const run = probeRunMission(target, survey)
        return [...(run ? [run] : []), ...probeContracts(target, survey, flown)]
      }).filter(mission => !existingMissionIds.has(mission.id))
    : []
  // SSL-657: a finished shower's special missions, by badge tier, voucher and Meteorite Mastery.
  const showerSpecials: Mission[] = freeOperations
    ? specialMissions(mergedTargets, player ?? {}, flown).filter(mission => !existingMissionIds.has(mission.id))
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

  // Co-funded client-progress/diplomacy missions are deferred with the Academy
  // progression branch. Do not generate them until a single player-progress
  // model specifies how they are earned and explained.
  const jointMissions: Mission[] = []

  const focusedMinerals = Object.entries(player?.resourceFocus?.minerals ?? {}).reduce<Record<string, number>>(
    (missing, [mineral, required]) => {
      const amount = Math.max(0, required - (player?.stash?.[mineral] ?? 0))
      if (amount > 0) missing[mineral] = amount
      return missing
    },
    {},
  )
  const focusedCargo = Object.values(focusedMinerals).reduce((total, amount) => total + amount, 0)
  // A haul already in flight stays resolvable after its materials are covered or the focus is cleared
  // (mining deposits into the stash mid-run), so a reload or resume never loses the run.
  const hasActiveResourceFocusRun = missionId === RESOURCE_FOCUS_MISSION_ID
  const resourceFocusLabel = player?.resourceFocus?.label ?? 'construction'
  const resourceFocusMissions: Mission[] = (player?.resourceFocus && focusedCargo > 0) || hasActiveResourceFocusRun
    ? [{
        id: RESOURCE_FOCUS_MISSION_ID,
        title: `Materials for ${resourceFocusLabel}`,
        brief: `Collect the missing materials for ${resourceFocusLabel} over as many trips as needed. Return each haul to Base and store it for construction.`,
        tag: 'RESOURCE',
        difficulty: 'L1',
        locked: false,
        sequence: missionsDone + 1,
        unlockAt: 'Add a construction requirement to focus',
        // The focus is a long-term goal, not a single-flight order. A ship
        // only needs room for one obtainable piece to start collecting it.
        requires: { minerals: focusedMinerals, cargo_min: focusedCargo > 0 ? Math.min(...Object.keys(focusedMinerals).map(id => Math.max(1, catalog.minerals[id]?.cargoUnits ?? 1))) : 0, drill_tier: 1, max_orbit: 8 },
        payout: { francs: 0, affinity: 0 },
      }]
    : []

  return {
    ...catalog,
    targets: mergedTargets,
    missions: tagMissionCategories([...relationshipMissions, ...transitTelescopeMission, ...saturnImagerMission, ...probeMissions, ...probeFollowUps, ...showerSpecials, ...surveyMissions, ...jointMissions, ...resourceFocusMissions]),
  }
}
