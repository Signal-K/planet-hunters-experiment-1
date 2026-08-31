import { STARTING_FRANCS } from '@/lib/data/economy'
import type { CompletedMissionRecord, GameState, LicenseGrade, Player, Screen } from '@/lib/game-types'
import { MISSIONS, TARGETS } from '@/lib/data'
import { FREE_OPS_START_MISSIONS_DONE } from '@/lib/data/mission-generator'
import { migrateCrewRoster } from '@/lib/systems/CrewSystem'
import { normalizeSurfaceOps } from '@/lib/systems/SurfaceOpsSystem'
import { settleCrewEconomy } from '@/lib/systems/AcademySystem'
import { FEATURE_FLAGS } from '@/lib/featureFlags'
import { findTargetStructure } from '@/lib/data/target-structures'
import { resolveConstructionState } from '@/lib/systems/ConstructionSystem'
import { EARTH_BASE_SCOPE } from '@/lib/scene-scope'

// Represents untrusted/partial saved state (e.g. from localStorage or remote sync)
// where player fields are optional since older saves may be missing new fields.
export type PartialSave = Omit<Partial<GameState>, 'player'> & { player?: Partial<Player> }

const VALID_SCREENS: Screen[] = ['intro', 'build', 'hub', 'missions', 'galaxy', 'targets', 'fab', 'transit', 'landing', 'mining', 'delivery', 'debrief', 'refinery', 'market', 'hangar', 'rocket-buy', 'skills', 'scan-station', 'rover-mining', 'launchpad', 'surface-ops', 'academy', 'asteroid-discovery', 'mission-history']
const MISSION_CONTEXT_SCREENS = new Set<Screen>(['targets', 'rocket-buy', 'fab', 'transit', 'mining', 'rover-mining', 'delivery', 'debrief'])
const TARGET_CONTEXT_SCREENS = new Set<Screen>(['rocket-buy', 'fab', 'transit', 'mining', 'rover-mining', 'delivery', 'debrief'])
const VALID_LICENSE_GRADES: LicenseGrade[] = ['Grade I', 'Grade II', 'Grade III']
const RUNTIME_MISSION_IDS = new Set(['story-transit-telescope-launch'])
const RUNTIME_TARGET_IDS = new Set(['earth-orbit-transit-telescope'])

export const DEFAULT_STATE: GameState = {
  screen: 'intro',
  player: {
    francs: STARTING_FRANCS,
    activeMission: null,
    missionCount: 1,
    pendingLaunch: false,
    pendingRocketId: undefined,
    placed: [],
    placementPlots: {},
    controlBuilt: false,
    missionsDone: 0,
    skillPoints: 0,
    unlockedSkillNodes: [],
    freeOperations: false,
    clientMissions: {},
    completedMissions: [],
    clientStreaks: {},
    clientCooldowns: {},
    researchAnnotations: 0,
    refineryBuilt: false,
    refineryUnlocked: false,
    refineryUnlockNotified: false,
    refineryQueue: [],
    refinedGoods: {},
    launchpadUpgraded: false,
    loanDebt: 0,
    loanOffered: false,
    seen_planets: [],
    roverDeployments: [],
    roverTerrainClassifications: {},
    clientTerritories: {},
    tessClassifications: {},
    artifactNarrativeSeenAt: null,
    asteroidClassifications: {},
    instrumentDigestNotifiedOn: {},
    discoveredExoplanetTargets: {},
    subsurfaceExcavated: false,
    subsurfaceBuilt: [],
    transitSatelliteLevel: 1,
    transitSatelliteLaunchedAt: null,
    deepSpaceTelescopeBuilt: false,
    deepSpaceTelescopeLevel: 1,
    deepSpaceTelescopeLaunchedAt: null,
    deepSpaceTelescopeMissionCompletedAt: null,
    scanStationMissionCompletedAt: null,
    licenseGrade: 'Grade I',
    researchXP: 0,
    unlockedBlueprints: [],
    crew: [],
    formerCrew: [],
    crewHiresLifetime: 0,
    crewHiresThisWeek: 0,
    crewTraining: [],
    trainingSessionsUsedToday: 0,
    missionCrewIds: [],
    crewMissionAwards: [],
    crewVisitedTargets: [],
    structureCrewAssignments: {},
    sharedChartsByClient: {},
    academyResearched: false,
    academyFunded: false,
    academyXP: 0,
    crewModuleResearched: false,
    surfaceOps: { sites: {} },
  },
  missionId: null,
  targetId: null,
  missionBoardScope: EARTH_BASE_SCOPE,
  rocket: { chassis: 'hull-mk1', propulsion: 'ion-a1', drill: 'hand-drill' },
  lastCargo: null,
  deliveredCargo: null,
  tutorial: true,
  doneSteps: {},
  popup: null,
  menuOpen: false,
}

// Renamed from "contractor" to "client" terminology (STS-535). Old saves in
// localStorage and PocketBase's game_states.state JSON still carry the old
// field names, so remap them onto the new ones here — the single choke point
// both loadState() and the PocketBase remote-sync path run saves through.
function migrateLegacyContractorFields(player: Partial<Player>): Partial<Player> {
  const legacy = player as Record<string, unknown>
  const migrated: Partial<Player> = { ...player }
  if (migrated.clientMissions === undefined && legacy.contractorMissions) migrated.clientMissions = legacy.contractorMissions as Player['clientMissions']
  if (migrated.clientStreaks === undefined && legacy.contractorStreaks) migrated.clientStreaks = legacy.contractorStreaks as Player['clientStreaks']
  if (migrated.clientCooldowns === undefined && legacy.contractorCooldowns) migrated.clientCooldowns = legacy.contractorCooldowns as Player['clientCooldowns']
  if (migrated.lastClient === undefined && legacy.lastContractor) migrated.lastClient = legacy.lastContractor as Player['lastClient']
  if (migrated.clientTerritories === undefined && legacy.contractorTerritories) migrated.clientTerritories = legacy.contractorTerritories as Player['clientTerritories']
  if (migrated.dailyClientPool === undefined && legacy.dailyContractorPool) migrated.dailyClientPool = legacy.dailyContractorPool as Player['dailyClientPool']
  if (migrated.clientStructures === undefined && legacy.contractorStructures) migrated.clientStructures = legacy.contractorStructures as Player['clientStructures']
  if (Array.isArray(migrated.clientStructures)) {
    migrated.clientStructures = migrated.clientStructures.map(s => {
      const legacyStructure = s as unknown as Record<string, unknown>
      if (s.clientId !== undefined || !legacyStructure.contractorId) return s
      return { ...s, clientId: legacyStructure.contractorId as string }
    })
  }
  if (Array.isArray(migrated.roverDeployments)) {
    migrated.roverDeployments = migrated.roverDeployments.map(d => {
      const legacyDeployment = d as unknown as Record<string, unknown>
      if (d.clientId !== undefined || !legacyDeployment.contractorId) return d
      return { ...d, clientId: legacyDeployment.contractorId as string }
    })
  }
  return migrated
}

function normalizeCompletedMissions(value: unknown): CompletedMissionRecord[] {
  if (!Array.isArray(value)) return DEFAULT_STATE.player.completedMissions ?? []
  return value.filter((entry): entry is CompletedMissionRecord => {
    if (!entry || typeof entry !== 'object') return false
    const record = entry as Partial<CompletedMissionRecord>
    return typeof record.id === 'string'
      && typeof record.title === 'string'
      && typeof record.completedAt === 'number'
      && Number.isFinite(record.completedAt)
      && (record.clientName === undefined || typeof record.clientName === 'string')
      && (record.targetName === undefined || typeof record.targetName === 'string')
      && (record.runId === undefined || typeof record.runId === 'string')
      && (record.kind === undefined || record.kind === 'client' || record.kind === 'program')
  }).slice(-100)
}

export function normalizeState(input: PartialSave): GameState {
  const screen = input.screen && VALID_SCREENS.includes(input.screen) ? input.screen : DEFAULT_STATE.screen
  const missionId = typeof input.missionId === 'string' ? input.missionId : null
  const targetId = missionId && typeof input.targetId === 'string' ? input.targetId : null
  const savedScope = input.missionBoardScope
  const missionBoardScope = savedScope?.kind === 'body' && typeof savedScope.id === 'string' && savedScope.id.length > 0
    ? { kind: 'body' as const, id: savedScope.id, label: savedScope.label || savedScope.id }
    : EARTH_BASE_SCOPE
  const player: Partial<Player> = migrateLegacyContractorFields(input.player ?? {})
  const completedMissions = normalizeCompletedMissions(player.completedMissions)
  const licenseGrade = player.licenseGrade && VALID_LICENSE_GRADES.includes(player.licenseGrade)
    ? player.licenseGrade
    : DEFAULT_STATE.player.licenseGrade
  const researchXP = Number.isFinite(player.researchXP)
    ? Math.max(0, Math.floor(player.researchXP ?? 0))
    : DEFAULT_STATE.player.researchXP
  const unlockedBlueprints = Array.isArray(player.unlockedBlueprints)
    ? Array.from(new Set(player.unlockedBlueprints.filter((id): id is string => typeof id === 'string' && id.length > 0)))
    : DEFAULT_STATE.player.unlockedBlueprints
  const tessClassifications = player.tessClassifications && typeof player.tessClassifications === 'object'
    ? player.tessClassifications
    : DEFAULT_STATE.player.tessClassifications
  const asteroidClassifications = player.asteroidClassifications && typeof player.asteroidClassifications === 'object'
    ? player.asteroidClassifications
    : DEFAULT_STATE.player.asteroidClassifications
  const roverTerrainClassifications = player.roverTerrainClassifications && typeof player.roverTerrainClassifications === 'object'
    ? player.roverTerrainClassifications
    : DEFAULT_STATE.player.roverTerrainClassifications
  const discoveredExoplanetTargets = player.discoveredExoplanetTargets && typeof player.discoveredExoplanetTargets === 'object'
    ? player.discoveredExoplanetTargets
    : DEFAULT_STATE.player.discoveredExoplanetTargets
  const instrumentDigestNotifiedOn = player.instrumentDigestNotifiedOn
    && typeof player.instrumentDigestNotifiedOn === 'object'
    && !Array.isArray(player.instrumentDigestNotifiedOn)
    ? Object.fromEntries(
      Object.entries(player.instrumentDigestNotifiedOn)
        .filter((entry): entry is [string, string] =>
          typeof entry[0] === 'string'
          && entry[0].length > 0
          && typeof entry[1] === 'string'
          && /^\d{4}-\d{2}-\d{2}$/.test(entry[1])
        )
    )
    : DEFAULT_STATE.player.instrumentDigestNotifiedOn
  const transitSatelliteLevel = Number.isFinite(player.transitSatelliteLevel)
    ? Math.max(1, Math.floor(player.transitSatelliteLevel ?? 1))
    : DEFAULT_STATE.player.transitSatelliteLevel
  const deepSpaceTelescopeLevel = Number.isFinite(player.deepSpaceTelescopeLevel)
    ? Math.max(1, Math.floor(player.deepSpaceTelescopeLevel ?? 1))
    : DEFAULT_STATE.player.deepSpaceTelescopeLevel
  // Rovers predate the roster, so a save can carry roverDeployments and no
  // crew at all. Fold them in here — the one choke point every load path runs
  // through — rather than leaving the roster and roverDeployments to drift.
  const crew = migrateCrewRoster(player, Date.now())
  const surfaceOps = normalizeSurfaceOps(player.surfaceOps)
  const clientStructures = Array.isArray(player.clientStructures)
    ? player.clientStructures.map(record => {
      const blueprint = findTargetStructure(record.structureKind)
      return blueprint ? resolveConstructionState(record, blueprint.buildTimeMs) : record
    })
    : DEFAULT_STATE.player.clientStructures

  // `placed` is the record of what the player actually built; the per-structure
  // booleans are conveniences derived from it. They can disagree: a save made
  // before `applyPlaceStructure` started setting a flag has the structure in
  // `placed` and the flag false, which is why the hub kept telling players to
  // "Build a Transit Telescope" they had already built. Derive the
  // flags from `placed` so the two can never drift again — and OR rather than
  // overwrite, so a flag set by any other route still counts.
  const savedPlaced = Array.isArray(player.placed) ? player.placed : DEFAULT_STATE.player.placed
  const placedList = FEATURE_FLAGS.scanStation
    ? savedPlaced
    : savedPlaced.filter(kind => kind !== 'scan-station')
  const placementPlots = Object.fromEntries(
    Object.entries(player.placementPlots ?? {}).filter(([kind]) => FEATURE_FLAGS.scanStation || kind !== 'scan-station')
  )
  const builtFrom = (kind: string, flag: boolean | undefined) => !!flag || placedList.includes(kind)
  const deepSpaceTelescopeBuilt = builtFrom('deep-space-telescope', player.deepSpaceTelescopeBuilt)
  const refineryBuilt = builtFrom('refinery', player.refineryBuilt)
  const scannerBuilt = FEATURE_FLAGS.scanStation && builtFrom('scan-station', player.scannerBuilt)
  // KES-177: Free Operations is a progression boundary, not a freely
  // persisted toggle. Older/incorrect remote saves can have the flag set
  // before M3; derive it from missionsDone so the early game can never expose
  // the post-onboarding telescope flow.
  const missionsDone = Number.isFinite(player.missionsDone)
    ? Math.max(0, Math.floor(player.missionsDone ?? 0))
    : DEFAULT_STATE.player.missionsDone
  const freeOperations = missionsDone >= FREE_OPS_START_MISSIONS_DONE
  const legacyClaim = input.pendingTerritoryClaimFor as unknown as { targetId: string; clientId?: string; contractorId?: string } | undefined
  const pendingTerritoryClaimFor = legacyClaim
    ? { targetId: legacyClaim.targetId, clientId: legacyClaim.clientId ?? legacyClaim.contractorId ?? '' }
    : undefined
  return {
    ...DEFAULT_STATE,
    ...input,
    screen,
    missionId,
    targetId,
    missionBoardScope,
    rocket: { ...DEFAULT_STATE.rocket, ...input.rocket },
    player: { ...DEFAULT_STATE.player, ...player, missionsDone, freeOperations, completedMissions, clientStructures, placed: placedList, placementPlots, licenseGrade, researchXP, unlockedBlueprints, tessClassifications, asteroidClassifications, roverTerrainClassifications, discoveredExoplanetTargets, instrumentDigestNotifiedOn, transitSatelliteLevel, deepSpaceTelescopeLevel, crew, surfaceOps,
      deepSpaceTelescopeBuilt, refineryBuilt, scannerBuilt },
    doneSteps: { ...DEFAULT_STATE.doneSteps, ...input.doneSteps },
    // Free Ops is the durable boundary. If an older save left `tutorial` true
    // after the final onboarding debrief, do not let that stale flag resurrect
    // the coach on the next load.
    tutorial: missionsDone >= FREE_OPS_START_MISSIONS_DONE ? false : (input.tutorial ?? DEFAULT_STATE.tutorial),
    ...(pendingTerritoryClaimFor ? { pendingTerritoryClaimFor } : {}),
  }
}

export function repairStateRoute(input: GameState): GameState {
  const mission = input.missionId
    ? (MISSIONS.find(m => m.id === input.missionId)
       ?? input.player.dailyClientPool?.missions.find(m => m.id === input.missionId)
       ?? null)
    : null
  const hasRuntimeMission = !!input.missionId && RUNTIME_MISSION_IDS.has(input.missionId)
  const target = input.targetId ? TARGETS.find(t => t.id === input.targetId) ?? null : null
  const hasRuntimeTarget = !!input.targetId && RUNTIME_TARGET_IDS.has(input.targetId)
  if (MISSION_CONTEXT_SCREENS.has(input.screen) && !mission && !hasRuntimeMission) {
    return { ...input, screen: 'missions', missionId: null, targetId: null }
  }
  if (TARGET_CONTEXT_SCREENS.has(input.screen) && !target && !hasRuntimeTarget) {
    return { ...input, screen: mission ? 'targets' : 'missions', targetId: null }
  }
  // A bare onboarding fab route is not a valid entry point. The Build tab is
  // locked until Free Ops; only a real selected mission may reach assembly
  // during the coached onboarding flow.
  if (input.screen === 'fab' && !input.player.freeOperations && (!mission || !target)) {
    return { ...input, screen: 'hub', missionId: null, targetId: null }
  }
  // Build placement is an intentional, short-lived action from the Hub — it
  // is not a useful resume destination. Persisting it left returning Free Ops
  // players on a dimmed plot picker with no context, even when their base was
  // already operational. New players (no structures yet) still begin here.
  if (input.screen === 'build' && input.player.freeOperations && input.player.placed.length > 0) {
    return { ...input, screen: 'hub' }
  }
  if (input.screen === 'targets' && mission?.targetId) {
    return { ...input, screen: 'rocket-buy', targetId: mission.targetId }
  }
  if (input.screen === 'galaxy' && !input.player.freeOperations) {
    return { ...input, screen: 'missions' }
  }
  if (input.screen === 'surface-ops' && (!input.player.freeOperations || !input.player.hasLanded)) {
    return { ...input, screen: 'hub' }
  }
  // Repair the tutorial flag: during onboarding (missionsDone < FREE_OPS_START_MISSIONS_DONE),
  // tutorial must always be active. It can become false if the catalog had no next-sequence
  // mission at the moment onDebriefDone ran, leaving M2/M3 coach permanently dark.
  // Explicit skips are still respected: skipTutorial marks every step done, so the coach
  // finds no matching step and hides itself without needing tutorial=false.
  if (input.player.missionsDone < FREE_OPS_START_MISSIONS_DONE && !input.tutorial) {
    return { ...input, tutorial: true }
  }
  return input
}

/** True only when a mission-completion transition crosses into Free Ops. */
export function justFinishedOnboarding(previousMissionsDone: number, nextMissionsDone: number): boolean {
  return previousMissionsDone < FREE_OPS_START_MISSIONS_DONE && nextMissionsDone >= FREE_OPS_START_MISSIONS_DONE
}

export function normalizeAndRepair(partial: PartialSave): GameState {
  return repairStateRoute(settleCrewEconomy(normalizeState(partial)))
}

/**
 * Merge a remote game_states record onto the in-memory state.
 *
 * Extracted from useAuthSync's applyRecord so the precedence rules are
 * testable without standing up PocketBase, React and a Fly cold-start ladder.
 *
 * Two independent guards, both defending against a *stale remote* clobbering
 * newer local play (the remote load can resolve many seconds after mount):
 *
 *  1. Navigation (screen/missionId/targetId) — local wins once the player has
 *     moved off the default screen or picked a mission/target locally.
 *  2. Onboarding position (player/tutorial/doneSteps) — local wins unless
 *     remote is strictly further ahead by missionsDone.
 *
 * Guard 2's three fields describe ONE position and must always resolve from
 * the same side. They previously did not: player and tutorial came from the
 * monotonic guard while doneSteps fell out of the object spread, so a reset
 * player (missionsDone 0, placed []) could keep a remote half-finished
 * doneSteps map. Since the tutorial coach renders the first step for the
 * current screen that is NOT in doneSteps, {0,1,2} marked done disabled the
 * coach on build, hub and missions simultaneously — a fresh save with no
 * visible tutorial and no launchpad. See STS-576.
 */
// Per-key max of two Record<string, number> maps (union of keys, higher value
// wins per key). Used for resource-like accumulators on a missionsDone tie —
// see mergeRemoteState's RESOURCE_* lists below.
function maxMergeRecord(a: Record<string, number> | undefined, b: Record<string, number> | undefined): Record<string, number> {
  const result: Record<string, number> = { ...(a ?? {}) }
  for (const [key, value] of Object.entries(b ?? {})) {
    result[key] = Math.max(result[key] ?? 0, value)
  }
  return result
}

// Resource-like scalar fields where losing progress to a blanket "local wins"
// on a tie is a real regression (STS-635) — verified never decremented except
// by an intentional spend/consume the player themselves triggered, so taking
// the higher of local/remote is safe: neither side can be "more wrong" than
// the other, only further along, per its own explicit instruction (francs,
// stash, refinedGoods, researchXP, skillPoints, researchAnnotations) plus
// verified monotonic-only-increment accumulators of the same shape
// (clientMissions, academyXP, crewHiresLifetime, sharedChartsByClient).
const RESOURCE_NUMBER_FIELDS = ['francs', 'researchXP', 'skillPoints', 'researchAnnotations', 'academyXP', 'crewHiresLifetime'] as const
const RESOURCE_RECORD_FIELDS = ['stash', 'refinedGoods', 'clientMissions', 'sharedChartsByClient'] as const

// Exoplanet discoveries are append-only: once a target has been confirmed it
// must survive a stale remote save just like placed structures and plots.
function mergeDiscoveredExoplanetTargets(
  local: Player['discoveredExoplanetTargets'],
  remote: Player['discoveredExoplanetTargets'],
): NonNullable<Player['discoveredExoplanetTargets']> {
  return { ...(remote ?? {}), ...(local ?? {}) }
}

export function mergeRemoteState(current: GameState, remoteState: PartialSave): GameState {
  const merged: GameState = { ...current, ...remoteState } as GameState

  const localHasProgressed = current.screen !== DEFAULT_STATE.screen
    || current.missionId !== null
    || current.targetId !== null
  if (localHasProgressed) {
    merged.screen = current.screen
    merged.missionId = current.missionId
    merged.targetId = current.targetId
  }

  const remoteMissionsDone = remoteState.player?.missionsDone ?? -1
  const isTie = current.player.missionsDone === remoteMissionsDone
  if (current.player.missionsDone > remoteMissionsDone) {
    // Local strictly ahead — unchanged from prior behavior: local player
    // wholesale, only placed/placementPlots unioned (construction is
    // monotonic within an onboarding stage; see the comment below).
    const remotePlaced = Array.isArray(remoteState.player?.placed) ? remoteState.player.placed : []
    const remotePlots = remoteState.player?.placementPlots ?? {}
    merged.player = {
      ...current.player,
      placed: Array.from(new Set([...current.player.placed, ...remotePlaced])),
      placementPlots: { ...remotePlots, ...current.player.placementPlots },
    }
    merged.tutorial = current.tutorial
    merged.doneSteps = current.doneSteps
  } else if (isTie) {
    // A genuine tie (same missionsDone on both sides, e.g. an offline session
    // on one device while another device also played at the same mission
    // count) previously discarded every remote field but placed/placementPlots
    // wholesale. That silently dropped real remote progress on francs, stash,
    // refinedGoods, research, etc. (STS-635).
    //
    // Resolution, in order:
    //  1. Start from local (safe default for anything not explicitly handled
    //     below) unless remote's updatedAt is strictly newer than local's, in
    //     which case start from remote for the fields not covered by 2/3 —
    //     this is the "fields that aren't naturally can-only-grow" fallback
    //     (e.g. a boolean flag or anything else not in the resource lists).
    //  2. Resource-like scalars/records (RESOURCE_NUMBER_FIELDS /
    //     RESOURCE_RECORD_FIELDS) always take the max per field/key,
    //     regardless of which side "wins" the timestamp comparison above.
    //  3. placed/placementPlots keep their existing union logic unchanged.
    const remoteIsNewer = typeof remoteState.updatedAt === 'number'
      && typeof current.updatedAt === 'number'
      && remoteState.updatedAt > current.updatedAt
    const base = remoteIsNewer ? { ...current.player, ...remoteState.player } : { ...current.player }

    const remotePlaced = Array.isArray(remoteState.player?.placed) ? remoteState.player.placed : []
    const remotePlots = remoteState.player?.placementPlots ?? {}

    merged.player = {
      ...base,
      placed: Array.from(new Set([...current.player.placed, ...remotePlaced])),
      placementPlots: { ...remotePlots, ...current.player.placementPlots },
    }
    for (const field of RESOURCE_NUMBER_FIELDS) {
      const localValue = current.player[field] ?? 0
      const remoteValue = remoteState.player?.[field] ?? 0
      merged.player[field] = Math.max(localValue, remoteValue)
    }
    for (const field of RESOURCE_RECORD_FIELDS) {
      merged.player[field] = maxMergeRecord(current.player[field], remoteState.player?.[field])
    }
    // Onboarding-position fields deliberately keep pre-existing tie behavior
    // (local wins) — out of scope per STS-635, see the run-resumability
    // comment further down for why doneSteps/tutorial are handled separately
    // from ordinary player state.
    merged.tutorial = current.tutorial
    merged.doneSteps = current.doneSteps
  } else {
    merged.player = { ...current.player, ...remoteState.player }
    merged.tutorial = remoteState.tutorial ?? current.tutorial
    merged.doneSteps = remoteState.doneSteps ?? {}
  }

  // This map is monotonic and is written by the local classification flow.
  // Apply the union after the missionsDone branch so a stale remote player
  // cannot erase a target before runtimeCatalog builds its survey mission.
  merged.player.discoveredExoplanetTargets = mergeDiscoveredExoplanetTargets(
    current.player.discoveredExoplanetTargets,
    remoteState.player?.discoveredExoplanetTargets,
  )

  // A run is resumable state, not onboarding progress. If the current device
  // has no active run but PocketBase does, keep the remote run and its route
  // context even when both saves are at the same mission count. This prevents
  // a stale local hub save from erasing the player's in-flight mission on
  // reload/login. The remote run's phase is data, not a navigation command:
  // an explicit local /game/hub or Back navigation must remain usable while
  // that run continues in the background.
  const remoteActiveMission = remoteState.player?.activeMission
  if (!current.player.activeMission && remoteActiveMission) {
    merged.player.activeMission = remoteActiveMission
    merged.player.missionRunId = remoteState.player?.missionRunId
    merged.player.missionPhase = remoteState.player?.missionPhase
    merged.player.arrivalAt = remoteState.player?.arrivalAt
    merged.player.transitStartedAt = remoteState.player?.transitStartedAt
    merged.player.deliveryUnloadStartedAt = remoteState.player?.deliveryUnloadStartedAt
    merged.player.headingToDelivery = remoteState.player?.headingToDelivery
    merged.player.returningToEarth = remoteState.player?.returningToEarth
    merged.player.debriefPending = remoteState.player?.debriefPending
    if (remoteState.missionId) merged.missionId = remoteState.missionId
    if (remoteState.targetId) merged.targetId = remoteState.targetId
    merged.deliveryTargetId = remoteState.deliveryTargetId
    merged.lastCargo = remoteState.lastCargo ?? null
    merged.deliveredCargo = remoteState.deliveredCargo ?? null
  }

  return normalizeAndRepair(merged)
}

export function loadState(storageKey: string): GameState {
  if (typeof window === 'undefined') return DEFAULT_STATE
  try {
    const raw = localStorage.getItem(storageKey)
    // A brand-new player still goes through migrations so the starting
    // astronaut, drone, and rover exist before the first playable screen.
    if (!raw) return normalizeAndRepair(DEFAULT_STATE)
    return normalizeAndRepair(JSON.parse(raw) as PartialSave)
  } catch {
    return DEFAULT_STATE
  }
}
