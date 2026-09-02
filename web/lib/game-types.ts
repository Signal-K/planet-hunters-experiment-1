// Landnam game — shared type definitions
// Extracted from game-context.tsx so they can be imported without pulling in React context.

import type { RocketConfig, Mission, Target, TessClassification, TessVerdict, TransitRange, AsteroidClassification, AsteroidVerdict } from '@/lib/data'
import type { RoverTerrainClass } from '@/lib/data/rover-scouting'
import type { RoverSpec } from '@takeon/engine'
import type { SceneScope } from './scene-scope'
import type { ClientBuildCompletionEvent, DailyEconomySnapshot } from './systems/DailyEconomySystem'
import type { TreasuryState } from './systems/TreasurySystem'

export interface DailyClientPool {
  date: string        // 'YYYY-MM-DD'
  missions: Mission[]
  acceptedId: string | null
  completedIds: string[]
}

export interface CompletedMissionRecord {
  id: string
  title: string
  targetId?: string
  clientName?: string
  targetName?: string
  completedAt: number
  runId?: string
  kind?: 'client' | 'program'
}

export type Screen =
  | 'intro'
  | 'build'
  | 'hub'
  | 'hub-subsurface'
  | 'missions'
  | 'galaxy'
  | 'targets'
  | 'fab'
  | 'transit'
  | 'landing'
  | 'mining'
  | 'delivery'
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
  | 'academy'
  | 'asteroid-discovery'
  | 'mission-history'
  | 'narrative-ledger'

export type LaunchpadView = 'focus'

// Screens that render a physical place in the game world (or a step in a
// mission run through one) get the full, edge-to-edge viewport on desktop —
// they are locations, not menus, and boxing them in the device-card chrome
// reads as a modal sitting over the game rather than the game itself.
// Screens NOT in this set ('intro', 'build', 'missions', 'targets', 'fab',
// 'market', 'skills', 'rocket-buy', 'debrief') are menus/UI concepts and keep
// the boxed card treatment. Debrief in particular is a mission-results
// summary/paperwork screen, not a place — it was wrongly added here in
// KES-261 and got full-screen treatment it never should have (KES-265).
// See `.portrait-canvas--full-page` in globals.css.
export const LOCATION_SCREENS: ReadonlySet<Screen> = new Set<Screen>([
  'hub',
  'hub-subsurface',
  'launchpad',
  'transit',
  'landing',
  'mining',
  'rover-mining',
  'delivery',
  'refinery',
  'scan-station',
  'academy',
  'hangar',
  'surface-ops',
  'galaxy',
  'asteroid-discovery',
])

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
  siteAccessPurchasedAt?: number
  launchpad?: SettlementLaunchpadRecord
  storage: Record<string, number>
  ferry?: SettlementFerryRecord
  /** The host-owned identity/configuration for one resumable TakeOn field session. */
  fieldOperation?: FieldOperation
}

export type FieldOperationObjectiveKind = 'settlement' | 'prospecting' | 'logistics'

export interface FieldOperationCargo {
  requirements: Record<string, number>
  capacity: number
}

export interface FieldOperationObjective {
  kind: FieldOperationObjectiveKind
  description: string
}

export interface FieldOperationReturnPolicy {
  owner: 'landnam'
  reconcileAt: 'field-return'
}

export interface FieldOperation {
  id: string
  missionId: string
  targetId: string
  siteId: string
  bodyId: string
  seed: number
  rover: RoverSpec
  label: string
  cargo: FieldOperationCargo
  objective: FieldOperationObjective
  returnPolicy: FieldOperationReturnPolicy
  startedAt: number
}

export interface SurfaceOpsState {
  sites: Record<string, SurfaceSiteProgress>
}

export interface Player {
  francs: number
  // Set once per track (KES-264) when the standalone /demo sandbox's
  // one-time completion bonus has been applied to this account, so a player
  // can't replay a demo mission to keep re-collecting it. The demo route
  // itself never touches this field or PocketBase directly — it only leaves
  // a `landnam-demo-bonus-pending` localStorage note; the real game applies
  // the bonus (and sets this) through the normal setPlayer/save path on next
  // boot. See applyPendingDemoBonus in game-context.tsx.
  demoBonusClaimed?: Partial<Record<'mining' | 'citizen-science', boolean>>
  activeMission: { id: string; label: string } | null
  // PocketBase mission_runs record for the current run. Kept in the save so a
  // refresh/resume continues updating the same server-side lifecycle record.
  missionRunId?: string
  missionPhase?: 'transit' | 'landing' | 'mining' | 'delivery' | 'debrief'
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
  // KES-110: a synthetic rover observation is a player decision that points
  // the extraction run at an existing target mineral signature.
  roverTerrainClassifications?: Record<string, RoverTerrainClass>
  // Wall-clock start of the cargo-transfer operation at a two-leg mission's
  // delivery target. The unload scene derives progress from this epoch so
  // remounts, hidden tabs, and Back-to-hub pauses cannot restart it.
  deliveryUnloadStartedAt?: number
  // Wall-clock start of the lander detach/descend sequence on arrival, and of
  // the ascend/redock sequence after mining completes. Same "derive progress
  // from a persisted epoch" pattern as roverMiningStartedAt/deliveryUnloadStartedAt.
  landingStartedAt?: number
  landingReturnStartedAt?: number
  // True once the player has completed at least one lander redock. Gates
  // Surface Ops alongside freeOperations — see "Surface Ops gated on landing
  // research and lander module" (STS-640).
  hasLanded?: boolean
  missionCount: number
  pendingLaunch: boolean
  /** Rocket already built and waiting on the launchpad; prevents re-purchase on resume. */
  pendingRocketId?: string
  placed: string[]
  placementPlots: Record<string, number>
  controlBuilt: boolean
  missionsDone: number
  skillPoints?: number
  unlockedSkillNodes?: string[]
  freeOperations: boolean
  debriefPending?: boolean
  /** The haul was settled into an off-world silo or sold before Earth return. */
  cargoSettledOffworld?: boolean
  pendingRemoteDisposition?: 'store' | 'sell'
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
  /** Last published shared AEST price and client-demand snapshot. */
  dailyEconomySnapshot?: DailyEconomySnapshot
  /** Immutable evidence that a player-built client structure completed. */
  clientBuildEvents?: ClientBuildCompletionEvent[]
  clientMissions: Record<string, number>
  completedMissions?: CompletedMissionRecord[]
  clientStreaks?: Record<string, number>
  clientCooldowns: Record<string, number>
  researchAnnotations: number
  refineryBuilt: boolean
  refineryUnlocked?: boolean
  refineryUnlockNotified?: boolean
  refineryQueue: { recipeId: string; startedAt: number; durationMs?: number }[]
  /** Level 1 refinery can accept one shipment per UTC day. */
  refineryLastStartedAt?: number
  refinedGoods: Record<string, number>
  /** Raw ore stored at operational player-owned off-world silos, by target. */
  remoteStorage?: Record<string, Record<string, number>>
  launchpadUpgraded: boolean
  lastClient?: string
  /** Mirrors treasury.loans[...].outstandingFrancs for this player; treasury is authoritative. */
  loanDebt: number
  loanOffered: boolean
  /** Provisional per-player instance until KES-287 gives the treasury a real shared home. */
  treasury?: TreasuryState
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
  // Subsurface deck (STS-633): the below-soil area starts unexcavated, and
  // each room must be built into it individually before it holds live
  // inventory — mirrors the surface Build·Place cost shape.
  subsurfaceExcavated?: boolean
  subsurfaceBuilt?: string[]
  // Purchased/earned integer levels, not XP tracks (STS-606 decision): each
  // is set/incremented directly by a build or mission event (EconomySystem,
  // useGameLoop), never accumulated as XP against a curve. Do not route these
  // through XPSystem or describe them as "progression" in UI copy — if they
  // ever need fractional progress or a real curve, that's a new decision, not
  // an assumed migration.
  transitSatelliteLevel?: number
  transitSatelliteLaunchedAt?: number | null
  // Deep Space Telescope (STS-622): a separate, one-time-build structure that
  // gates the asteroid-discovery (NEOCP) instrument feed, the same way
  deepSpaceTelescopeBuilt?: boolean
  deepSpaceTelescopeLevel?: number
  deepSpaceTelescopeLaunchedAt?: number | null
  // KES-128: completing the story-deep-space-telescope-survey mission — the
  // on-ramp mirroring story-transit-telescope-launch — rather than the raw
  // deepSpaceTelescopeUnlocked() threshold. Distinct from
  // deepSpaceTelescopeLaunchedAt above, which marks when the structure was
  // physically placed, not when the player earned the right to build it.
  deepSpaceTelescopeMissionCompletedAt?: number | null
  // KES-132: completing the story-scan-station-commission mission — same
  // on-ramp pattern as deepSpaceTelescopeMissionCompletedAt above, gating
  // the Scan Station's build slot instead of the raw feature flag.
  scanStationMissionCompletedAt?: number | null
  scansUsedToday?: number
  scanDate?: string
  activeScan?: { targetId: string; completesAt: number } | null
  targetScanCounts?: Record<string, number>
  tessClassifications?: Record<string, TessClassification>
  // One-shot late-game narrative beat after a high-level TESS confirmation.
  artifactNarrativeSeenAt?: number | null
  // Deep Space Telescope's asteroid-discovery (NEOCP) classifications
  // (STS-622) — same shape/role as tessClassifications above, keyed by
  // asteroid_candidates record id, but a separate map since it's a
  // genuinely second instrument, not a variant of the transit feed.
  asteroidClassifications?: Record<string, AsteroidClassification>
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
  /**
   * Last UTC digest date notified per owned instrument. Persisting this keeps
   * the daily downlink from re-notifying after reloads or React remounts.
   */
  instrumentDigestNotifiedOn?: Record<string, string>
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
  formerCrew?: import('@/lib/data').CrewRehireOffer[]
  crewHiresLifetime?: number
  crewHiresThisWeek?: number
  crewHireWeek?: string
  crewUpkeepSettledDate?: string
  crewTraining?: import('@/lib/data').CrewTrainingSession[]
  trainingSessionsUsedToday?: number
  trainingDate?: string
  missionCrewIds?: string[]
  crewMissionAwards?: string[]
  crewVisitedTargets?: string[]
  structureCrewAssignments?: Record<string, string>
  sharedChartsByClient?: Record<string, number>
  academyResearched?: boolean
  academyFunded?: boolean
  academyXP?: number
  crewModuleResearched?: boolean
  // Landing research: unlocks the Lander Module ship room. Not a crew/academy
  // mechanic — kept separate from academyResearched's prerequisite chain.
  landingResearched?: boolean
  // Solo Surface Ops state. Site access is a build-cost gate, not a
  // shared-world claim. Ferry records retain a stable cargo-batch id and reconciliation
  // timestamp so retries and reloads cannot credit one manifest twice.
  surfaceOps?: SurfaceOpsState
}

export interface GameState {
  screen: Screen
  player: Player
  missionId: string | null
  targetId: string | null
  /** Explicit body context for a mission-board view; Earth Base is the default. */
  // Older saved states and test fixtures predate scene-scoped mission views;
  // normalizeAndRepair() supplies Earth Base when this is absent.
  missionBoardScope?: SceneScope
  // Set for two-leg "mine then deliver" missions — the second-leg
  // destination, distinct from targetId (the mining/pickup target).
  deliveryTargetId?: string | null
  rocket: RocketConfig
  lastCargo: Record<string, number> | null
  // Receipt retained after a two-leg mission unloads the ship. `lastCargo`
  // becomes an empty hold before the Earth-return leg, while Debrief still
  // needs the delivered manifest to settle the contract.
  deliveredCargo?: Record<string, number> | null
  tutorial: boolean
  doneSteps: Record<number, boolean>
  popup: string | null
  menuOpen: boolean
  pendingTerritoryClaimFor?: { targetId: string; clientId: string }
  // Epoch ms this save was last written to localStorage on THIS device
  // (STS-635). Stamped by the localStorage persist effect in game-context.tsx.
  // Used only as a tie-breaker in mergeRemoteState when missionsDone is equal
  // on both sides — the remote side's equivalent signal is PocketBase's own
  // `updated` autodate field on the game_states record (not this field; the
  // remote record's JSON blob does not need its own copy since the load path
  // reads the record's system timestamp directly). missionsDone remains the
  // primary onboarding-stage signal; this only disambiguates true ties.
  updatedAt?: number
  /** Dev-preset-only data switch. Never set by normal gameplay or persistence. */
  visualFixture?: 'tess' | 'asteroid'
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
  continueWithEmail: (email: string) => Promise<void>
  authGateOtpId: string | null
  verifyOtp: (code: string) => Promise<void>
  go: (screen: Screen) => void
  launchpadView: LaunchpadView
  openLaunchpad: () => void
  focusLaunchpad: () => void
  returnFromHangar: () => void
  goToMissions: (scope?: SceneScope) => void
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
  subsurfaceView: boolean
  setSubsurfaceView: (v: boolean) => void
  onPickMission: (id: string) => void
  onPickTarget: (id: string) => void
  onPurchaseRocket: (rocketId: string) => void
  onLaunch: () => void
  onMiningDone: (cargo: Record<string, number>, remoteDisposition?: 'store' | 'sell') => void
  onDeliveryArrived: () => void
  onDeliveryUnloadComplete: () => void
  onReturnArrived: () => void
  onDebriefDone: (total: number, affinity: number, consumed?: Record<string, number>, disposition?: 'store' | 'sell') => void
  coachManualNext: () => void
  completeStep: (id: number) => void
  resetGame: () => void
  signOut: () => void
  upgradeLaunchpad: () => void
  placeStructure: (structure: import('@/lib/data').StructureBlueprint | undefined, kind: string, plot: number) => void
  excavateSubsurface: () => void
  buildSubsurfaceRoom: (roomId: import('@/lib/data').SubsurfaceRoomId) => void
  sellMinerals: (mineralId: string, amount: number) => void
  sellRefinedGoods: (recipeId: string, amount: number) => void
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
  submitAsteroidClassification: (candidateId: string, verdict: AsteroidVerdict) => void
  onRoverMiningDone: (cargo: Record<string, number>) => void
  onLandingTouchdown: () => void
  onRedockComplete: (cargo: Record<string, number>, remoteDisposition?: 'store' | 'sell') => void
  confirmShipCustomizerBuild: (installed: Partial<Record<import('@/lib/data').ShipRoomKind, string>>, prevInstalled: Partial<Record<import('@/lib/data').ShipRoomKind, string>>) => boolean
  purchaseSiteAccess: (siteId: string) => void
  startFieldOperation: (siteId: string) => void
  buildSettlementLaunchpad: (siteId: string, pad: 0 | 1 | 2) => void
  recordSurfaceMined: (siteId: string, mineralId: string, amount: number) => void
  dispatchSurfaceFerry: (siteId: string) => void
  retrySurfaceFerry: (siteId: string) => void
  reconcileSurfaceFerry: (siteId: string) => void
  acknowledgeSurfaceFerry: (siteId: string) => void
  gainResearchXP: (amount: number) => void
  upgradeLicenseGrade: (grade: Exclude<LicenseGrade, 'Grade I'>) => void
  unlockBlueprint: (blueprintId: string, costFrancs?: number, costXP?: number, costMaterials?: Record<string, number>) => void
  claimFriendGift: (giftId: string) => Promise<void>
  researchAcademy: () => void
  researchLanding: () => void
  setAcademyFunding: (funded: boolean) => void
  hireCrew: (sourceId: string) => void
  rehireCrew: (crewId: string) => void
  startCrewTraining: (crewId: string, branch: import('@/lib/data').SkillBranch) => void
  startCandidateTraining: (branch: import('@/lib/data').SkillBranch) => void
  collectCrewTraining: (sessionId: string) => void
  researchCrewModule: () => void
  assignCrewToStructure: (structureId: string, crewId: string | null) => void
  shareChartsWithClient: (clientId: string) => void
  toasts: Toast[]
  addToast: (message: string, kind?: Toast['kind']) => void
  dismissToast: (id: string) => void
  mission: Mission | null
  target: Target | null
  sceneScope: SceneScope
  awaitingRemoteState: boolean
  clearTerritoryClaimPopup: () => void
  laserChargeCap: number
}
