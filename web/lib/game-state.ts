import type { GameState, LicenseGrade, Player, Screen } from '@/lib/game-types'
import { MISSIONS, TARGETS } from '@/lib/data'
import { FREE_OPS_START_MISSIONS_DONE } from '@/lib/data/mission-generator'

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
    francs: 10_000_000_000,
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
    contractorMissions: {},
    contractorStreaks: {},
    contractorCooldowns: {},
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
    contractorTerritories: {},
    tessClassifications: {},
    discoveredExoplanetTargets: {},
    satelliteMonitoringBuilt: false,
    satelliteMonitoringLevel: 1,
    transitSatelliteLevel: 1,
    transitSatelliteLaunchedAt: null,
    licenseGrade: 'Grade I',
    researchXP: 0,
    unlockedBlueprints: [],
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

export function normalizeState(input: PartialSave): GameState {
  const screen = input.screen && VALID_SCREENS.includes(input.screen) ? input.screen : DEFAULT_STATE.screen
  const missionId = typeof input.missionId === 'string' ? input.missionId : null
  const targetId = missionId && typeof input.targetId === 'string' ? input.targetId : null
  const player: Partial<Player> = input.player ?? {}
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
  return {
    ...DEFAULT_STATE,
    ...input,
    screen,
    missionId,
    targetId,
    rocket: { ...DEFAULT_STATE.rocket, ...input.rocket },
    player: { ...DEFAULT_STATE.player, ...player, licenseGrade, researchXP, unlockedBlueprints, tessClassifications, discoveredExoplanetTargets, satelliteMonitoringLevel, transitSatelliteLevel },
    doneSteps: { ...DEFAULT_STATE.doneSteps, ...input.doneSteps },
  }
}

export function repairStateRoute(input: GameState): GameState {
  const mission = input.missionId
    ? (MISSIONS.find(m => m.id === input.missionId)
       ?? input.player.dailyContractorPool?.missions.find(m => m.id === input.missionId)
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
