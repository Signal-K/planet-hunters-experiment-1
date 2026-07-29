import { STARTING_FRANCS } from '@/lib/data/economy'
import type { GameState, LicenseGrade, Player, Screen } from '@/lib/game-types'
import { MISSIONS, TARGETS } from '@/lib/data'
import { FREE_OPS_START_MISSIONS_DONE } from '@/lib/data/mission-generator'
import { migrateCrewRoster } from '@/lib/systems/CrewSystem'

// Represents untrusted/partial saved state (e.g. from localStorage or remote sync)
// where player fields are optional since older saves may be missing new fields.
export type PartialSave = Omit<Partial<GameState>, 'player'> & { player?: Partial<Player> }

const VALID_SCREENS: Screen[] = ['intro', 'build', 'hub', 'missions', 'galaxy', 'targets', 'fab', 'transit', 'mining', 'debrief', 'refinery', 'market', 'hangar', 'rocket-buy', 'skills', 'scan-station', 'rover-mining']
const MISSION_CONTEXT_SCREENS = new Set<Screen>(['targets', 'rocket-buy', 'fab', 'transit', 'mining', 'rover-mining', 'debrief'])
const TARGET_CONTEXT_SCREENS = new Set<Screen>(['rocket-buy', 'fab', 'transit', 'mining', 'rover-mining', 'debrief'])
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
    placed: [],
    placementPlots: {},
    controlBuilt: false,
    missionsDone: 0,
    skillPoints: 0,
    unlockedSkillNodes: [],
    freeOperations: false,
    clientMissions: {},
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
    clientTerritories: {},
    tessClassifications: {},
    discoveredExoplanetTargets: {},
    satelliteMonitoringBuilt: false,
    satelliteMonitoringLevel: 1,
    transitSatelliteLevel: 1,
    transitSatelliteLaunchedAt: null,
    licenseGrade: 'Grade I',
    researchXP: 0,
    unlockedBlueprints: [],
    crew: [],
  },
  missionId: null,
  targetId: null,
  rocket: { chassis: 'hull-mk1', propulsion: 'ion-a1', drill: 'hand-drill' },
  lastCargo: null,
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

export function normalizeState(input: PartialSave): GameState {
  const screen = input.screen && VALID_SCREENS.includes(input.screen) ? input.screen : DEFAULT_STATE.screen
  const missionId = typeof input.missionId === 'string' ? input.missionId : null
  const targetId = missionId && typeof input.targetId === 'string' ? input.targetId : null
  const player: Partial<Player> = migrateLegacyContractorFields(input.player ?? {})
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
  const discoveredExoplanetTargets = player.discoveredExoplanetTargets && typeof player.discoveredExoplanetTargets === 'object'
    ? player.discoveredExoplanetTargets
    : DEFAULT_STATE.player.discoveredExoplanetTargets
  const satelliteMonitoringLevel = Number.isFinite(player.satelliteMonitoringLevel)
    ? Math.max(1, Math.floor(player.satelliteMonitoringLevel ?? 1))
    : DEFAULT_STATE.player.satelliteMonitoringLevel
  const transitSatelliteLevel = Number.isFinite(player.transitSatelliteLevel)
    ? Math.max(1, Math.floor(player.transitSatelliteLevel ?? 1))
    : DEFAULT_STATE.player.transitSatelliteLevel
  // Rovers predate the roster, so a save can carry roverDeployments and no
  // crew at all. Fold them in here — the one choke point every load path runs
  // through — rather than leaving the roster and roverDeployments to drift.
  const crew = migrateCrewRoster(player, Date.now())

  // `placed` is the record of what the player actually built; the per-structure
  // booleans are conveniences derived from it. They can disagree: a save made
  // before `applyPlaceStructure` started setting a flag has the structure in
  // `placed` and the flag false, which is why the hub kept telling players to
  // "Build a Satellite Monitoring Station" they had already built. Derive the
  // flags from `placed` so the two can never drift again — and OR rather than
  // overwrite, so a flag set by any other route still counts.
  const placedList = Array.isArray(player.placed) ? player.placed : DEFAULT_STATE.player.placed
  const builtFrom = (kind: string, flag: boolean | undefined) => !!flag || placedList.includes(kind)
  const satelliteMonitoringBuilt = builtFrom('satellite-monitoring-station', player.satelliteMonitoringBuilt)
  const refineryBuilt = builtFrom('refinery', player.refineryBuilt)
  const scannerBuilt = builtFrom('scan-station', player.scannerBuilt)
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
    rocket: { ...DEFAULT_STATE.rocket, ...input.rocket },
    player: { ...DEFAULT_STATE.player, ...player, licenseGrade, researchXP, unlockedBlueprints, tessClassifications, discoveredExoplanetTargets, satelliteMonitoringLevel, transitSatelliteLevel, crew,
      satelliteMonitoringBuilt, refineryBuilt, scannerBuilt },
    doneSteps: { ...DEFAULT_STATE.doneSteps, ...input.doneSteps },
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
  if (input.screen === 'targets' && mission?.targetId) {
    return { ...input, screen: 'rocket-buy', targetId: mission.targetId }
  }
  if (input.screen === 'galaxy' && !input.player.freeOperations) {
    return { ...input, screen: 'missions' }
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

export function normalizeAndRepair(partial: PartialSave): GameState {
  return repairStateRoute(normalizeState(partial))
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
  if (current.player.missionsDone >= remoteMissionsDone) {
    // Construction is monotonic within an onboarding stage. A browser can
    // have an older local save at Ops 0 while PocketBase already contains the
    // launchpad the player placed; replacing the remote player wholesale here
    // made that building disappear on refresh/login. Keep local values as the
    // authority for the rest of the equal-stage player state, but retain every
    // structure and its saved plot from either side.
    const remotePlaced = Array.isArray(remoteState.player?.placed) ? remoteState.player.placed : []
    const remotePlots = remoteState.player?.placementPlots ?? {}
    merged.player = {
      ...current.player,
      placed: Array.from(new Set([...current.player.placed, ...remotePlaced])),
      placementPlots: { ...remotePlots, ...current.player.placementPlots },
    }
    merged.tutorial = current.tutorial
    merged.doneSteps = current.doneSteps
  } else {
    merged.player = { ...current.player, ...remoteState.player }
    merged.tutorial = remoteState.tutorial ?? current.tutorial
    merged.doneSteps = remoteState.doneSteps ?? {}
  }

  // A run is resumable state, not onboarding progress. If the current device
  // has no active run but PocketBase does, keep the remote run and its route
  // context even when both saves are at the same mission count. This prevents
  // a stale local hub save from erasing the player's in-flight mission on
  // reload/login.
  const remoteActiveMission = remoteState.player?.activeMission
  if (!current.player.activeMission && remoteActiveMission) {
    merged.player.activeMission = remoteActiveMission
    merged.player.missionRunId = remoteState.player?.missionRunId
    merged.player.missionPhase = remoteState.player?.missionPhase
    if (remoteState.missionId) merged.missionId = remoteState.missionId
    if (remoteState.targetId) merged.targetId = remoteState.targetId
    if (remoteState.screen && MISSION_CONTEXT_SCREENS.has(remoteState.screen)) merged.screen = remoteState.screen
  }

  return normalizeAndRepair(merged)
}

export function loadState(storageKey: string): GameState {
  if (typeof window === 'undefined') return DEFAULT_STATE
  try {
    const raw = localStorage.getItem(storageKey)
    if (!raw) return DEFAULT_STATE
    return normalizeAndRepair(JSON.parse(raw) as PartialSave)
  } catch {
    return DEFAULT_STATE
  }
}
