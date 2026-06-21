// Landnam game — shared type definitions
// Extracted from game-context.tsx so they can be imported without pulling in React context.

import type { RocketConfig } from '@/lib/data'

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

export interface Player {
  francs: number
  activeMission: { id: string; label: string } | null
  missionCount: number
  pendingLaunch: boolean
  placed: string[]
  placementPlots: Record<string, number>
  controlBuilt: boolean
  missionsDone: number
  freeOperations: boolean
  debriefPending?: boolean
  stash?: Record<string, number>
  contractorMissions: Record<string, number>
  contractorStreaks?: Record<string, number>
  contractorCooldowns: Record<string, number>
  researchAnnotations: number
  refineryBuilt: boolean
  refineryQueue: { recipeId: string; startedAt: number }[]
  refinedGoods: Record<string, number>
  launchpadUpgraded: boolean
  lastContractor?: string
  loanDebt: number
  loanOffered: boolean
  arrivalAt?: number | null
  seen_planets?: string[]
  roverDeployments?: Array<{
    roverId: string
    targetId: string
    contractorId: string
    timestamp: number
  }>
  contractorTerritories?: Record<string, string[]>
}

export interface GameState {
  screen: Screen
  player: Player
  missionId: string | null
  targetId: string | null
  rocket: RocketConfig
  lastCargo: Record<string, number> | null
  tutorial: boolean
  doneSteps: Record<number, boolean>
  popup: string | null
  menuOpen: boolean
  pendingTerritoryClaimFor?: { targetId: string; contractorId: string }
}

import type React from 'react'
import type { Mission, Target } from '@/lib/data'
import type { Toast } from '@/components/ui/ToastLayer'
import type { Catalog } from '@/lib/catalog'

export interface GameActions {
  catalog: Catalog
  authGateOpen: boolean
  authGateError: string | null
  signInFromGate: (email: string, password: string) => Promise<void>
  createAccountFromGate: (email: string, password: string) => Promise<void>
  skipAuthGate: () => void
  go: (screen: Screen) => void
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
  onDebriefDone: (total: number, affinity: number, consumed?: Record<string, number>) => void
  coachManualNext: () => void
  completeStep: (id: number) => void
  resetGame: () => void
  upgradeLaunchpad: () => void
  sellMinerals: (mineralId: string, amount: number) => void
  onStartRefine: (recipeId: string) => void
  onCollectRefined: (recipeId: string) => void
  acceptLoan: () => void
  abandonMission: () => void
  toasts: Toast[]
  dismissToast: (id: string) => void
  mission: Mission | null
  target: Target | null
  upgradePromptOpen: boolean
  dismissUpgradePrompt: () => void
  upgradeAccount: (email: string, password: string) => Promise<void>
  awaitingRemoteState: boolean
  clearTerritoryClaimPopup: () => void
}
