// Landnam game data — all shared types and interfaces

export interface MissionPayload {
  type: 'rover' | 'satellite' | 'deep-space-survey' | 'scan-station-commission'
  name: string
  cargoCost: number
}

export interface MissionSurveyPlan {
  scanRequired: boolean
  scanCount: number
  scanSource: 'station' | 'satellite' | 'rover'
  depositsToMap: number
  revealsMinerals: boolean
  revealsLandmarks: string[]
  unlocksLanding: boolean
  onWorldVehicle?: 'starter-rover'
  anyTargetType?: boolean
}

export type ConstructionPlacementMode = 'confirm' | 'grid' | 'free'

export interface MissionConstructionPlan {
  structureKind: string
  requiredMaterials: Record<string, number>
  placementMode: ConstructionPlacementMode
  buildTimeMs: number
}

export type TargetStructureState = 'delivered' | 'under-construction' | 'operational'

export interface TargetStructureBlueprint {
  id: string
  name: string
  kind: string
  clientRole: string
  requiredMaterials: Record<string, number>
  buildTimeMs: number
  description: string
}

export interface ClientStructureRecord {
  targetId: string
  structureKind: string
  clientId: string
  state: TargetStructureState
  startedAt?: number
}

export type DailyQuestKind = 'scan' | 'land' | 'map'
export type DailyQuestTargetScope = 'any' | 'any-asteroid' | 'any-planet' | 'specific'

export interface DailyQuestTemplate {
  id: string
  kind: DailyQuestKind
  title: string
  brief: string
  targetScope: DailyQuestTargetScope
  targetId?: string
  count: number
  payout: { francs: number; affinity: number }
  requiresScannerBuilt?: boolean
  requiresSurveyClear?: boolean
}

export interface DailyQuestProgress {
  questId: string
  progress: number
  completed: boolean
  date: string
}

export interface ProgramReward {
  /** Research progression granted when the owned operation is completed. */
  researchXP: number
  /** Player-facing description of what the operation adds to their program. */
  outcome: string
}

export interface Mission {
  id: string
  title: string
  brief: string
  client?: string
  tag: string
  difficulty: string
  locked: boolean
  sequence: number
  unlockAt?: string
  targetId?: string
  // When set, this is a two-leg "mine then deliver" job: mine/collect cargo
  // at targetId, then fly to deliveryTargetId before the Earth-return leg.
  deliveryTargetId?: string
  payload?: MissionPayload
  survey?: MissionSurveyPlan
  construction?: MissionConstructionPlan
  /**
   * Outcome for a player-owned operation. These runs use the flight engine,
   * but are not client contracts and do not pay francs or affinity.
   */
  programReward?: ProgramReward
  requires: {
    minerals: Record<string, number>
    cargo_min: number
    drill_tier: number
    max_orbit: number
    crew?: import('./crew').CrewRequirement
  }
  jointProject?: {
    playerCost: number
    clientCostShare: number
    payoutBonus: number
    infrastructureOrbitBonus: number
  }
  payout: {
    francs: number
    affinity: number
  }
}

export interface Target {
  id: string
  name: string
  type: 'planet' | 'asteroid' | 'exoplanet'
  orbit: number
  difficulty: string
  brief: string
  minerals: string[]
  // Composition archetype driving `minerals` (see target-archetypes.ts).
  // Exoplanet targets get one too, assigned from the player-measured
  // orbital period + host star type at discovery time — see
  // archetypeForDiscovery() in tess-candidates.ts.
  archetype?: import('./target-archetypes').TargetArchetype
  recommended?: boolean
}

export interface Part {
  id: string
  name: string
  tier: number
  locked: boolean
  img: string
  // chassis
  mass?: number
  cargo?: number
  // propulsion
  power?: number
  max_orbit?: number
  // drill
  rate?: number
  missionsRequired?: number
}

export interface MineralMeta {
  name: string
  sym: string
  color: string
  price: number
  rarity: 'common' | 'uncommon' | 'rare' | 'exotic'
  constructionUse: string
  laserAccess: number
  // True for minerals that are abundant on Earth (iron, carbon, etc.) — Earth
  // already has plentiful supply, so contracts delivering back to Earth should
  // never request these; they only make sense for off-world construction jobs
  // (deliveryTargetId set to a non-Earth site).
  earthAbundant?: boolean
  // Ore node shape in the mining minigame. Single source of truth for both the
  // order-progress legend icon and the actual in-canvas ore render — several
  // minerals (esp. platinum-group metals) share near-identical pale colors, so
  // shape is what actually disambiguates them on screen. Defaults to 'circle'
  // when unset.
  shape?: 'circle' | 'diamond' | 'rect' | 'triangle'
}

export interface Client {
  id: string
  name: string
  color: string
  initial: string
  unlockTier: number
  projectType: string
  mineralPreferences: string[]
  payoutPremium: number
  affinityBonusPerMission: number
  uiRole: ClientSlot['uiRole']
  payoutNotes?: string
  affinityNotes?: string
  suppliesCrew: boolean
}

export interface ClientSlot {
  id: string
  name: string
  color: string
  initial: string
  unlockTier: number
  projectType: string
  mineralPreferences: string[]
  payoutPremium: number
  affinityBonusPerMission: number
  payoutNotes: string
  affinityNotes: string
  uiRole: 'starter' | 'bulk' | 'prospect' | 'command' | 'science'
  suppliesCrew: boolean
}

export interface StructureBlueprint {
  id: string
  name: string
  kind: string
  cost: number
  costMaterials?: Record<string, number>
  unlocksAt: string
  unlockTrigger?: 'always' | 'free-operations' | 'client-mission-trigger' | 'academy-research' | 'deep-space-telescope-unlock' | 'manual'
  description: string
}

export interface MarketTemplate {
  id: string
  label: string
  currency: string
  baseRate: number
  volatility: number
}

export interface MissionTemplate {
  id: string
  tag: string
  difficulty: string
  mineralKeys: string[]
  cargoRange: [number, number]
  drillTierMin: number
  orbitMax: number
  payoutMultiplier: number
  clientRole: ClientSlot['uiRole']
  payoutFormula: string
  survey?: MissionSurveyPlan
  construction?: MissionConstructionPlan
}

export interface RefineryRecipe {
  id: string
  name: string
  input: { mineral: string; amount: number }
  output: { name: string; sym: string; color: string; price: number }
  time: number
  cost: number
}

export interface Star {
  id: string
  name: string
  x: number
  y: number
  kind: string
  dist: string
}

export interface RocketModel {
  id: string
  name: string
  tier: number
  costFrancs: number
  missionsRequired: number
  locked: boolean
  stats: { cargo: number; maxOrbit: number; drillTier: number }
  img: string
  unlockHint: string
}

export interface TutorialStep {
  id: number
  screen: string
  title: string
  body: string
  action?: string
  manual?: boolean
  anchor: 'top' | 'bottom' | 'center'
  spot: { x: number; y: number; w: number; h: number; fromBottom?: boolean; fromCenter?: boolean; right?: number } | null
  cta: string
  /** data-coach-id of the element to highlight via CSS (set on <html> as data-coach-target). */
  coachId?: string
  /** Direction arrow shown in coach pill: points user toward the target. */
  dir?: 'up' | 'down' | 'left' | 'right'
  /** Overrides for desktop layout (sidebar nav replaces radial menu) */
  desktopBody?: string
  desktopAction?: string
  desktopSpot?: TutorialStep['spot']
  desktopCoachId?: string
  desktopDir?: 'up' | 'down' | 'left' | 'right'
}

export interface RocketConfig {
  chassis: string
  propulsion: string
  drill: string
}

export interface BuildCheck {
  chassis: Part
  propulsion: Part
  drill: Part
  ok: boolean
  problems: string[]
}
