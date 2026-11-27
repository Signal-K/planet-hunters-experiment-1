import { communityWorlds } from '@/lib/agency/community'
import { missionFromPlan, sanitizeMissionPlans } from '@/lib/mission-planner'
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
import { ORIONIDS_NIGHT_RUN_ID, orionidsNightRun, showerRunMission } from './data/missions'
import { SHOWERS, ORIONIDS_SHOWER_ID, showerForRunMission } from './data/showers'
import { DEBRIS_PRESETS, isDebrisEventActive } from './data/sky-events'
import { fleetCondition, SERVICED_CRAFT, type ServicedCraftId } from './agency/condition'

export const TRANSIT_TELESCOPE_TARGET_ID = 'earth-orbit-transit-telescope'
export const TRANSIT_TELESCOPE_MISSION_ID = 'story-transit-telescope-launch'

// KES-128: the Space Telescope's on-ramp, matching the Transit
// Telescope's story-mission pattern above rather than the bare numeric
// deepSpaceTelescopeUnlocked() threshold (STS-622) silently opening a build
// slot with no narrative reason it happened.
export const DEEP_SPACE_TELESCOPE_TARGET_ID = 'earth-orbit-deep-space-telescope'
export const DEEP_SPACE_TELESCOPE_MISSION_ID = 'story-deep-space-telescope-survey'

// SSL-492: the Saturn satellite reuses the same launch -> flight -> debrief ->
// Instrument Hub path as the telescopes. No payout; real Cassini frames.
export const SATURN_IMAGER_TARGET_ID = 'earth-orbit-saturn-imager'
export const SATURN_IMAGER_MISSION_ID = 'story-saturn-imager-launch'

export const ORIONIDS_SHOWER_TARGET: Target = showerTarget(ORIONIDS_SHOWER_ID)

const SERVICE_TARGET: Record<ServicedCraftId, string> = {
  'space-telescope': TRANSIT_TELESCOPE_TARGET_ID,
  'saturn-satellite': SATURN_IMAGER_TARGET_ID,
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
  // Retain the target for a legacy trip already in progress. New telescope findings remain research records.
  const discoveredTargetList = [...Object.values(discoveredTargets), ...communityWorlds(player?.agencyCommunity).filter(target => !discoveredTargets[target.id])].filter(target => target.id === targetId)
  // A satellite or telescope is run from the control station, so none is offered until one is built.
  const hasControlStation = !!player?.placed?.includes('control-station')
  const shouldOfferTransitTelescopeMission = freeOperations && hasControlStation
  const hasActiveTransitTelescopeMission = missionId === TRANSIT_TELESCOPE_MISSION_ID || targetId === TRANSIT_TELESCOPE_TARGET_ID
  const shouldIncludeTransitTelescopeMission = shouldOfferTransitTelescopeMission || hasActiveTransitTelescopeMission
  const shouldOfferSaturnImagerMission = freeOperations && hasControlStation
  const hasActiveSaturnImagerMission = missionId === SATURN_IMAGER_MISSION_ID || targetId === SATURN_IMAGER_TARGET_ID
  const shouldIncludeSaturnImagerMission = shouldOfferSaturnImagerMission || hasActiveSaturnImagerMission
  const existingTargetIds = new Set(catalog.targets.map(target => target.id))
  // SSL-852: a craft below 75% is offered a servicing mission; the one in flight stays so the run can finish.
  const servicing = SERVICED_CRAFT.flatMap(craft => {
    const condition = player ? fleetCondition(player, craft, Date.now()) : null
    const inFlight = missionId === SERVICE_MISSION_ID[craft]
    // The craft is already up, so no Agency Hub is needed to fly to it.
    return (freeOperations && condition?.needsService) || inFlight ? [{ craft, percent: condition?.percent ?? null }] : []
  })
  const serviceTargetIds = new Set(servicing.map(item => SERVICE_TARGET[item.craft]))
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
    ...((shouldIncludeTransitTelescopeMission || serviceTargetIds.has(TRANSIT_TELESCOPE_TARGET_ID)) && !existingTargetIds.has(TRANSIT_TELESCOPE_TARGET.id) ? [TRANSIT_TELESCOPE_TARGET] : []),
    ...((shouldIncludeSaturnImagerMission || serviceTargetIds.has(SATURN_IMAGER_TARGET_ID)) && !existingTargetIds.has(SATURN_IMAGER_TARGET.id) ? [SATURN_IMAGER_TARGET] : []),
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
        brief: 'Launch a space telescope for Exoplanet Hunters and Asteroid discovery. Each craft adds light curves and moving-object candidates every day; extra capacity can be shared from the Data hub.',
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
        brief: 'Launch a Saturn observation satellite for Saturn storms. Each craft adds one Cassini archive frame a day to the Data hub; extra capacity can be shared.',
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
  const siteMission: Mission[] = (player?.agencyCommunity?.siteUnlocks ?? []).some(id => /^community-site-\d{4}-\d{2}:(spaceport-launch-site|observatory-instrument)$/.test(id)) && freeOperations && hasControlStation
    ? [{ ...transitTelescopeMission[0], id: 'community-science-launch', title: 'Launch the community research telescope', brief: 'The completed Community Site opened this shared launch programme for every agency. Fly a space telescope for Exoplanet Hunters and Asteroid discovery; share its spare capacity from the Data hub.', targetId: TRANSIT_TELESCOPE_TARGET_ID, tag: 'PROGRAM', difficulty: 'L1', locked: false, sequence: missionsDone + 1, unlockAt: 'Complete a Community Site', payload: { type: 'satellite', name: 'Community research telescope', cargoCost: 0, instrumentId: 'transit-telescope' }, requires: { minerals: {}, cargo_min: 0, drill_tier: 1, max_orbit: 1 }, payout: { francs: 0, affinity: 0 } }]
    : []
  // The worst-worn craft comes first.
  const serviceMissions: Mission[] = [...servicing].sort((a, b) => (a.percent ?? 100) - (b.percent ?? 100))
    .map(item => serviceMission(item.craft, item.percent, missionsDone + 1))
    .filter(mission => !existingMissionIds.has(mission.id))
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

  const plannedMissions = Object.values(sanitizeMissionPlans(player?.missionPlans)).flatMap(plan => {
    const target = mergedTargets.find(target => target.id === plan.targetId)
    return target ? [missionFromPlan(plan, target, catalog.minerals)] : []
  })
  return {
    ...catalog,
    targets: mergedTargets,
    missions: tagMissionCategories([...relationshipMissions, ...transitTelescopeMission, ...saturnImagerMission, ...serviceMissions, ...siteMission, ...probeMissions, ...probeFollowUps, ...showerSpecials, ...surveyMissions, ...jointMissions, ...resourceFocusMissions, ...plannedMissions]),
  }
}

const TRANSIT_TELESCOPE_TARGET: Target = {
  id: TRANSIT_TELESCOPE_TARGET_ID,
  name: 'Earth Orbit',
  type: 'planet',
  orbit: 1,
  difficulty: 'L1',
  brief: 'Low Earth orbit deployment lane for a space telescope monitored from Base operations.',
  minerals: [],
}

const SATURN_IMAGER_TARGET: Target = {
  id: SATURN_IMAGER_TARGET_ID,
  name: 'Saturn observation lane',
  type: 'planet',
  orbit: 1,
  difficulty: 'L1',
  brief: 'Orbital lane for a Saturn satellite that downlinks archived Cassini frames for storm-cloud review.',
  minerals: [],
}

/** SSL-852: servicing missions fly to the craft's orbit and put it back to full condition. */
const SERVICE_MISSION_ID: Record<ServicedCraftId, string> = {
  'space-telescope': 'service-space-telescope',
  'saturn-satellite': 'service-saturn-satellite',
}

function serviceMission(craft: ServicedCraftId, percent: number | null, sequence: number): Mission {
  const name = craft === 'space-telescope' ? 'Space telescope' : 'Saturn satellite'
  const named = craft === 'space-telescope' ? 'space telescope' : 'Saturn satellite'
  const feed = craft === 'space-telescope' ? 'light curves and asteroid candidates' : 'Cassini frames'
  const state = percent === null ? '' : percent < 15 ? ' It has failed and sends nothing.' : percent < 50 ? ` It is at ${percent}% and sends half its ${feed}.` : ` It is at ${percent}%.`
  return {
    id: SERVICE_MISSION_ID[craft],
    title: `Service the ${named}`,
    brief: `Fly a servicing crew up to your ${named} and put it right.${state} Use and solar storms wear it down.`,
    tag: 'PROGRAM',
    difficulty: 'L1',
    locked: false,
    sequence,
    unlockAt: 'Own the craft',
    targetId: SERVICE_TARGET[craft],
    payload: { type: 'satellite', name: `${name} servicing`, cargoCost: 0, service: craft },
    requires: { minerals: {}, cargo_min: 0, drill_tier: 1, max_orbit: 1 },
    programReward: { researchXP: 10, outcome: `${name} serviced · back to 100%, full data restored` },
    payout: { francs: 0, affinity: 0 },
  }
}

/** The field a shower run flies to (SSL-658, SSL-774). */
function showerTarget(showerId: string): Target {
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
