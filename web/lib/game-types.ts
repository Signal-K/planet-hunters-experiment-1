// Landnam game — shared type definitions
// Extracted from game-context.tsx so they can be imported without pulling in React context.

import type { RocketConfig, Mission, Target, TessClassification, TessVerdict, TransitRange } from '@/lib/data'

export interface DailyClientPool {
  date: string        // 'YYYY-MM-DD'
  missions: Mission[]
  acceptedId: string | null
  completedIds: string[]
}

export type Screen =
  | 'intro'
  | 'build'
  | 'hub'
  | 'missions'
  | 'galaxy'
  | 'targets'
  | 'fab'
  | 'transit'
  | 'mining'
  | 'debrief'
  | 'refinery'
  | 'market'
  | 'hangar'
  | 'rocket-buy'
  | 'skills'
  | 'scan-station'
  | 'rover-mining'
  | 'launchpad'
  | 'surface-ops'

export type LicenseGrade = 'Grade I' | 'Grade II' | 'Grade III'

export type SettlementFerryStatus = 'in-flight' | 'delivered' | 'failed'

export interface SettlementLaunchpadRecord {
  pad: 0 | 1 | 2
  startedAt: number
  completesAt: number
}

export interface SettlementFerryRecord {
  id: string
  status: SettlementFerryStatus
  manifest: Record<string, number>
  dispatchedAt: number
  arrivesAt: number
  attempts: number
  deliveredAt?: number
  reconciledAt?: number
  failureReason?: string
}

export interface SurfaceSiteProgress {
  rightsPurchasedAt?: number
  launchpad?: SettlementLaunchpadRecord
  storage: Record<string, number>
  ferry?: SettlementFerryRecord
}

export interface SurfaceOpsState {
  sites: Record<string, SurfaceSiteProgress>
}

export interface Player {
  francs: number
  activeMission: { id: string; label: string } | null
  // PocketBase mission_runs record for the current run. Kept in the save so a
  // refresh/resume continues updating the same server-side lifecycle record.
  missionRunId?: string
  missionPhase?: 'transit' | 'mining' | 'debrief'
  // Ore collected so far during an in-progress mining run, preserved across a
  // "Back to hub" pause so resuming the mission doesn't silently discard
  // already-collected cargo (that cargo only lived in MiningScreen's local
  // state before this, and was lost on remount). Cleared once the mission
  // completes or is abandoned.
  miningCargoInProgress?: Record<string, number>
  // Wall-clock start of an in-progress rover mining run, persisted so a
  // Back-to-hub pause and resume doesn't restart the extraction timer from
  // zero (RoverMiningScreen would otherwise re-init its own Date.now() on
  // remount). Cleared once the run completes or is abandoned.
  roverMiningStartedAt?: number
  missionCount: number
  pendingLaunch: boolean
  placed: string[]
  placementPlots: Record<string, number>
  controlBuilt: boolean
  missionsDone: number
  skillPoints?: number
  unlockedSkillNodes?: string[]
  freeOperations: boolean
  debriefPending?: boolean
  returningToEarth?: boolean
  shipDestroyed?: boolean
  // True while in transit toward a two-leg mission's deliveryTargetId, after
  // mining/pickup at the primary target and before the Earth-return leg.
  headingToDelivery?: boolean
  stash?: Record<string, number>
  // Units-sold-equivalent on the open market per mineral, decayed over real
  // time (see EconomySystem.decayedUnitsSold) — drives the supply/demand
  // price dip in EconomySystem's open-market sell price. Paired with
  // marketSupplyUpdatedAt so the dip recovers between sessions instead of
  // capping out permanently once enough of a mineral has ever been sold.
  marketSupply?: Record<string, number>
  marketSupplyUpdatedAt?: Record<string, number>
  clientMissions: Record<string, number>
  clientStreaks?: Record<string, number>
  clientCooldowns: Record<string, number>
  researchAnnotations: number
  refineryBuilt: boolean
  refineryUnlocked?: boolean
  refineryUnlockNotified?: boolean
  refineryQueue: { recipeId: string; startedAt: number }[]
  refinedGoods: Record<string, number>
  launchpadUpgraded: boolean
  lastClient?: string
  loanDebt: number
  loanOffered: boolean
  arrivalAt?: number | null
  // Wall-clock departure for the current transit leg. Keeping this alongside
  // arrivalAt lets the transit animation resume at the correct visual time
  // after a tab switch or screen remount.
  transitStartedAt?: number | null
  seen_planets?: string[]
  roverDeployments?: Array<{
    roverId: string
    targetId: string
    clientId: string
    timestamp: number
  }>
  clientTerritories?: Record<string, string[]>
  dailyClientPool?: DailyClientPool
  scannerBuilt?: boolean
  satelliteMonitoringBuilt?: boolean
  satelliteMonitoringLevel?: number
  transitSatelliteLevel?: number
  transitSatelliteLaunchedAt?: number | null
  scansUsedToday?: number
  scanDate?: string
  activeScan?: { targetId: string; completesAt: number } | null
  targetScanCounts?: Record<string, number>
  tessClassifications?: Record<string, TessClassification>
  // Player's satellite-pointing choice for the *next* daily downlink,
  // picked from the PixiGalaxyStarMap after classifying today's candidate.
  // Consumed (cleared) once that candidate becomes today's daily pick.
  satelliteTargetId?: string | null
  // True when a global "5 players confirmed a planet" event happened that
  // this player hasn't acted on yet — lets them re-pick their satellite
  // target immediately instead of waiting for the normal daily cycle. See
  // ~/Navigation/workspace/decisions/citizen-science-consensus-cross-post-and-immediate-repick.md
  pendingRepick?: boolean
  // Last confirmed_at value (from GET /api/ss/subjects/last-confirmed) this
  // player has already been notified about, so the poller doesn't re-fire
  // the same event every check.
  lastSeenConfirmedAt?: string | null
  discoveredExoplanetTargets?: Record<string, Target>
  clientStructures?: import('@/lib/data').ClientStructureRecord[]
  dailyQuestProgress?: import('@/lib/data').DailyQuestProgress[]
  licenseGrade?: LicenseGrade
  researchXP?: number
  unlockedBlueprints?: string[]
  // Persisted ship-customiser loadout for the player's owned Explorer (sr1) —
  // part id installed per room slot. Confirmed builds deduct real francs and
  // survive across sessions instead of resetting to a fresh 3B mock budget.
  shipCustomizerParts?: Partial<Record<import('@/lib/data').ShipRoomKind, string>>
  // Astronaut Academy roster (STS-591). Crew are persisted individuals —
  // astronauts, rovers and drones — not a headcount. Rovers here are the same
  // rovers as roverDeployments above, surfaced as roster entries by
  // migrateCrewRoster; they are not a second, parallel rover system.
  crew?: import('@/lib/data').CrewMember[]
  // Solo Surface Ops state. Rights are a build-cost gate, not a shared-world
  // claim. Ferry records retain a stable cargo-batch id and reconciliation
  // timestamp so retries and reloads cannot credit one manifest twice.
  surfaceOps?: SurfaceOpsState
}

export interface GameState {
  screen: Screen
  player: Player
  missionId: string | null
  targetId: string | null
  // Set for two-leg "mine then deliver" missions — the second-leg
  // destination, distinct from targetId (the mining/pickup target).
  deliveryTargetId?: string | null
  rocket: RocketConfig
  lastCargo: Record<string, number> | null
  tutorial: boolean
  doneSteps: Record<number, boolean>
  popup: string | null
  menuOpen: boolean
  pendingTerritoryClaimFor?: { targetId: string; clientId: string }
}

import type React from 'react'
import type { Toast } from '@/components/ui/ToastLayer'
import type { Catalog } from '@/lib/catalog'

export interface GameActions {
  catalog: Catalog
  hydrated: boolean
  authUserId: string | null
  landnamSynced: boolean
  authGateOpen: boolean
  authGateError: string | null
  signInFromGate: (email: string, password: string) => Promise<void>
  createAccountFromGate: (email: string, password: string) => Promise<void>
  skipAuthGate: () => void
  go: (screen: Screen) => void
  goToMissions: () => void
  setScreenFromUrl: (screen: Screen) => void
  setPlayer: React.Dispatch<React.SetStateAction<Player>>
  setMissionId: (id: string | null) => void
  setTargetId: (id: string | null) => void
  setRocket: (r: RocketConfig | ((prev: RocketConfig) => RocketConfig)) => void
  setLastCargo: (c: Record<string, number> | null) => void
  setTutorial: (v: boolean) => void
  setDoneSteps: React.Dispatch<React.SetStateAction<Record<number, boolean>>>
  skipTutorial: (stepIds: number[]) => void
  setPopup: (v: string | null) => void
  setMenuOpen: (v: boolean) => void
  onPickMission: (id: string) => void
  onPickTarget: (id: string) => void
  onPurchaseRocket: (rocketId: string) => void
  onLaunch: () => void
  onMiningDone: (cargo: Record<string, number>) => void
  onDeliveryArrived: () => void
  onReturnArrived: () => void
  onDebriefDone: (total: number, affinity: number, consumed?: Record<string, number>) => void
  coachManualNext: () => void
  completeStep: (id: number) => void
  resetGame: () => void
  signOut: () => void
  upgradeLaunchpad: () => void
  placeStructure: (structure: import('@/lib/data').StructureBlueprint | undefined, kind: string, plot: number) => void
  sellMinerals: (mineralId: string, amount: number) => void
  onStartRefine: (recipeId: string) => void
  onCollectRefined: (recipeId: string) => void
  unlockSkillNode: (id: string) => void
  acceptLoan: () => void
  abandonMission: () => void
  buildScanner: () => void
  startScan: (targetId: string) => void
  collectScan: () => void
  launchTransitSatellite: () => void
  submitTessClassification: (subjectId: string, verdict: TessVerdict, ranges: TransitRange[], discoveredTarget?: Target) => void
  chooseSatelliteTarget: (subjectId: string) => void
  onRoverMiningDone: (cargo: Record<string, number>) => void
  confirmShipCustomizerBuild: (installed: Partial<Record<import('@/lib/data').ShipRoomKind, string>>, prevInstalled: Partial<Record<import('@/lib/data').ShipRoomKind, string>>) => boolean
  purchaseTerrainRights: (siteId: string) => void
  buildSettlementLaunchpad: (siteId: string, pad: 0 | 1 | 2) => void
  recordSurfaceMined: (siteId: string, mineralId: string, amount: number) => void
  dispatchSurfaceFerry: (siteId: string) => void
  retrySurfaceFerry: (siteId: string) => void
  reconcileSurfaceFerry: (siteId: string) => void
  acknowledgeSurfaceFerry: (siteId: string) => void
  gainResearchXP: (amount: number) => void
  upgradeLicenseGrade: (grade: Exclude<LicenseGrade, 'Grade I'>) => void
  unlockBlueprint: (blueprintId: string, costFrancs?: number, costXP?: number, costMaterials?: Record<string, number>) => void
  toasts: Toast[]
  addToast: (message: string, kind?: Toast['kind']) => void
  dismissToast: (id: string) => void
  mission: Mission | null
  target: Target | null
  upgradePromptOpen: boolean
  dismissUpgradePrompt: () => void
  upgradeAccount: (email: string, password: string) => Promise<void>
  awaitingRemoteState: boolean
  clearTerritoryClaimPopup: () => void
  laserChargeCap: number
}
