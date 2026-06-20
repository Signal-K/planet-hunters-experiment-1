// Landnam game data — all shared types and interfaces

export interface Mission {
  id: string
  title: string
  brief: string
  contractor: string
  tag: string
  difficulty: string
  locked: boolean
  sequence: number
  unlockAt?: string
  requires: {
    minerals: Record<string, number>
    cargo_min: number
    drill_tier: number
    max_orbit: number
  }
  payout: {
    francs: number
    affinity: number
  }
}

export interface Target {
  id: string
  name: string
  type: 'planet' | 'asteroid'
  orbit: number
  difficulty: string
  brief: string
  minerals: string[]
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
}

export interface Contractor {
  id: string
  name: string
  color: string
  initial: string
  unlockTier: number
  projectType: string
  mineralPreferences: string[]
  payoutPremium: number
  affinityBonusPerMission: number
}

export interface ContractorSlot {
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
}

export interface StructureBlueprint {
  id: string
  name: string
  kind: string
  cost: number
  unlocksAt: string
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
  contractorRole: ContractorSlot['uiRole']
  payoutFormula: string
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

export interface StarterRocket {
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
  spot: { x: number; y: number; w: number; h: number; fromBottom?: boolean } | null
  cta: string
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
